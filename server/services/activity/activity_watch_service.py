from typing import Dict, List, Optional, Tuple, Union
from dataclasses import dataclass
from datetime import datetime, timezone
import logging
import json

from aw_client import ActivityWatchClient
from aw_client.queries import canonicalEvents, DesktopQueryParams

# Configure logging to see error messages
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@dataclass
class AppUsagePattern:
    """Represents the usage pattern analysis for a time window."""
    dominant_app: str
    dominance_ratio: float
    app_count: int
    is_productive: bool
    sorted_apps: List[Tuple[str, float]]

@dataclass
class SessionWindowStates:
    """Represents state information extracted from session window bucket history."""
    sequence: List[str]
    last: str
    consecutive_prefocus: int
    consecutive_unproductive: int

@dataclass
class ActivityBucket:
    """Represents a single activity bucket from the session window."""
    startTime: str
    endTime: str
    category: str
    id: Optional[int] = None
    subtaskId: Optional[int] = None
    date: Optional[str] = None
    dominantApp: Optional[str] = None
    apps: Optional[Dict[str, float]] = None
    workSessionApp: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None 

class Config:
    """Constants for thresholds and configuration."""
    IDLE_THRESHOLD_PERCENTAGE = 0.1  # Minimum 10% of window time must have activity to avoid idle classification
    WORK_SESSION_APP_THRESHOLD_PERCENTAGE = 0.05  # Minimum 5% of bucket time for meaningful app usage
    PREFOCUS_BUCKETS_REQUIRED = 2   # Consecutive prefocus buckets needed to achieve focus
    MAX_DISTRACTION_BUCKETS = 2     # Maximum distraction buckets before focus reset
    
    # Focus pattern threshold
    PRODUCTIVE_SWITCHING_THRESHOLD = 0.5   # Dominance ratio for productive classification
    
    # App switching distraction detection
    APP_SWITCHING_WINDOW_SIZE = 4   # Number of recent buckets to analyze for app switching
    APP_SWITCHING_THRESHOLD = 0.75  # If 75% or more buckets have different dominant apps, classify as distraction


class ActivityWatchService:
    def __init__(self, testing: bool = False):
        """Initialize the ActivityWatch service with configuration."""
        self.client = ActivityWatchClient("kairo", testing=testing)
        self.config = Config()
    
    @staticmethod
    def parse_datetime(dt_str: str) -> datetime:
        """Simple datetime parsing that handles ISO format strings and ensures timezone-aware output."""
        if not dt_str:
            raise ValueError("Empty datetime string")
        
        # Handle Z suffix by converting to +00:00 format for fromisoformat compatibility
        if dt_str.endswith('Z'):
            dt_str = dt_str.replace('Z', '+00:00')
        
        # Parse the ISO format string
        dt = datetime.fromisoformat(dt_str)
        
        # If somehow timezone-naive, assume UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        
        return dt
    
    def analyze_window_activity(
        self, 
        start_time: datetime, 
        end_time: datetime, 
        session_window: Optional[List[ActivityBucket]] = None
    ) -> Tuple[str, str, Dict[str, float], str]:
        """Analyze activity in a specific time window with historical context."""
        try:
            logger.info(f"Starting analysis for {start_time} to {end_time}")
            
            # Step 1: Get Activity Watch data
            buckets = self.client.get_buckets()
            window_bucket = afk_bucket = None
            
            for bucket_id in buckets.keys():
                if 'window' in bucket_id:
                    window_bucket = bucket_id
                elif 'afk' in bucket_id:
                    afk_bucket = bucket_id
            
            if not window_bucket:
                raise Exception("No window bucket found - ActivityWatch may not be running")
                
            # Set up query parameters for desktop with minimal categorization
            params = DesktopQueryParams(
                bid_window=window_bucket,
                bid_afk=afk_bucket or window_bucket,
                classes=[] # no categorization
            )
            
            query = canonicalEvents(params)
            
            # Add custom RETURN to get just the events and avoid categorization issues
            query = f"""
                    {query}
                    RETURN = {{"events": events}};
                    """
            # Execute the query for the specified time period
            result = self.client.query(query, [(start_time, end_time)])
            
            logger.info(f"Query result: {result}")
            
            # Extract events from the result
            if not result or not result[0] or not result[0].get("events"):
                logger.error(f"Invalid result structure: result={result}")
                raise Exception("Canonical events failed: result is invalid")
                
            events = result[0]["events"]  # Get events from the custom return structure
            
            # Step 2: Process activity data into app usage patterns
            window_duration_seconds = (end_time - start_time).total_seconds()
            app_usage = self._calculate_app_usage(events)
            if self._is_idle_period(app_usage, window_duration_seconds):
                return 'idle', '', app_usage.get('apps', {}), ''
            
            # Step 3: Analyze app usage patterns for focus classification
            app_patterns = self._analyze_app_patterns(
                app_usage['apps'], 
                app_usage['total_activity']
            )
            
            # Step 4: Determine work session context first
            work_session_app = self._detect_work_session_app(session_window) if session_window else ''
            
            # Step 5: Apply state machine logic with historical context
            category = self._classify_activity_state(app_patterns, session_window or [], work_session_app)
            
            return category, app_patterns.dominant_app, app_usage['apps'], work_session_app
                
        except Exception as e:
            logger.error(f"Error analyzing window activity: {e}")
            return 'idle', '', {}, ''
    
    def _calculate_app_usage(self, events) -> Dict[str, Union[Dict[str, float], float]]:
        """Calculate app usage statistics from ActivityWatch events."""
        apps = {}
        total_activity = 0
        
        for event in events:
            app_name = event.get('data', {}).get('app', '').lower()
            duration_seconds = event.get('duration', 0)
            
            total_activity += duration_seconds
            
            if app_name:
                # Store duration in seconds to match total_activity units
                apps[app_name] = apps.get(app_name, 0) + duration_seconds
        
        return {
            'apps': apps,
            'total_activity': total_activity
        }
    
    def _is_idle_period(self, app_usage: Dict, window_duration_seconds: float) -> bool:
        """Check if the time period should be classified as idle based on activity percentage."""
        if not app_usage['apps'] or window_duration_seconds <= 0:
            return True
            
        activity_percentage = app_usage['total_activity'] / window_duration_seconds
        return activity_percentage < self.config.IDLE_THRESHOLD_PERCENTAGE
    
    def _analyze_app_patterns(self, apps: Dict[str, float], total_activity: float) -> AppUsagePattern:
        """Analyze app usage patterns to determine focus characteristics."""
        # Handle empty apps or zero total activity
        if not apps or total_activity <= 0:
            return AppUsagePattern(
                dominant_app='unknown',
                dominance_ratio=0.0,
                app_count=0,
                is_productive=False,
                sorted_apps=[]
            )
        
        # Calculate dominance metrics
        sorted_apps = sorted(apps.items(), key=lambda x: x[1], reverse=True)
        dominant_app, dominant_time_seconds = sorted_apps[0]
        dominance_ratio = dominant_time_seconds / total_activity
        
        # Determine if activity is productive
        is_productive = dominance_ratio >= self.config.PRODUCTIVE_SWITCHING_THRESHOLD
        
        return AppUsagePattern(
            dominant_app=dominant_app,
            dominance_ratio=dominance_ratio,
            app_count=len(apps),
            is_productive=is_productive,
            sorted_apps=sorted_apps
        )
    
    def _classify_activity_state(
        self, 
        app_patterns: AppUsagePattern, 
        session_window: List[ActivityBucket],
        work_session_app: str
    ) -> str:
        """Classify the current activity state using app patterns and historical context."""
        # Determine if current activity is productive
        is_productive = app_patterns.is_productive
        
        # Check for app switching distraction patterns in session window
        has_app_switching_distraction = self._detect_app_switching_distraction(session_window, work_session_app, app_patterns.dominant_app)
        
        # Handle classification without historical context
        if not session_window:
            # Without history, respect the pattern quality
            if is_productive and not has_app_switching_distraction:
                return 'prefocus'  # Start building toward focus
            else:
                return 'distraction'
        
        # Analyze historical context
        recent_states = self._extract_recent_states(session_window)
        
        # Apply state machine logic with full context
        if is_productive and not has_app_switching_distraction:
            return self._handle_productive_state(recent_states)
        else:
            return 'distraction'
    
    def _extract_recent_states(self, session_window: List[ActivityBucket]) -> SessionWindowStates:
        """Extract state information from session window bucket history."""
        state_sequence = [bucket.category for bucket in session_window]
        last_state = state_sequence[-1] if state_sequence else 'unknown'
        
        return SessionWindowStates(
            sequence=state_sequence,
            last=last_state,
            consecutive_prefocus=self._count_consecutive_from_end(state_sequence, 'prefocus'),
            consecutive_unproductive=self._count_consecutive_from_end(state_sequence, ['distraction', 'idle'])
        )

    def _detect_app_switching_distraction(self, session_window: List[ActivityBucket], work_session_app: str, current_dominant_app: str) -> bool:
        """Detect if there's excessive app switching indicating distraction."""
        if not session_window or len(session_window) < 2:
            return False
        
        # Start from the newest buckets and work backwards
        # Only consider buckets that are in focused states (focus/prefocus)
        focused_buckets = []
        for bucket in reversed(session_window):
            if bucket.category in ['focus', 'prefocus'] and bucket.dominantApp:
                # Stop if we encounter a different work session app (different work context)
                if bucket.workSessionApp and bucket.workSessionApp != work_session_app:
                    break
                focused_buckets.append(bucket)
                # Stop when we have enough buckets to analyze
                if len(focused_buckets) >= self.config.APP_SWITCHING_WINDOW_SIZE:
                    break
        
        # Extract dominant apps from focused buckets (newest first)
        dominant_apps = [bucket.dominantApp for bucket in focused_buckets]
        
        # Add current dominant app if valid (represents the current activity)
        if current_dominant_app and current_dominant_app != 'unknown':
            dominant_apps.append(current_dominant_app)
        
        # Need at least 2 apps to detect switching
        if len(dominant_apps) < 2:
            return False
        
        # Count unique apps in the recent focused window
        unique_apps = set(dominant_apps)
        unique_app_ratio = len(unique_apps) / len(dominant_apps)
        
        # If the ratio of unique apps is high, it indicates frequent switching
        is_switching = unique_app_ratio >= self.config.APP_SWITCHING_THRESHOLD
        
        logger.debug(f"App switching analysis (focused only): current_dominant_app={current_dominant_app}, work_session_app={work_session_app}, apps={dominant_apps}, unique_ratio={unique_app_ratio:.2f}, threshold={self.config.APP_SWITCHING_THRESHOLD}, is_switching={is_switching}")
        
        return is_switching
    
    def _handle_productive_state(
        self, 
        recent_states: SessionWindowStates, 
    ) -> str:
        """Handle classification when current activity is productive (focused patterns)."""
        
        # If previous state was focus, maintain focus (momentum)
        if recent_states.last == 'focus':
            return 'focus'
        elif recent_states.consecutive_prefocus >= self.config.PREFOCUS_BUCKETS_REQUIRED - 1:
            # Accumulated enough prefocus to achieve focus
            return 'focus'
        elif recent_states.consecutive_unproductive > 0 and recent_states.consecutive_unproductive <= self.config.MAX_DISTRACTION_BUCKETS and self._had_focus_before_distractions(recent_states.sequence):
            return 'focus'
        else:
            # Still building prefocus
            return 'prefocus'
    
    def _count_consecutive_from_end(self, states: List[str], target_state: Union[str, List[str]]) -> int:
        """Count consecutive occurrences of target_state(s) from the end of the list."""
        count = 0
        # Convert single string to list for uniform handling
        target_states = [target_state] if isinstance(target_state, str) else target_state
        
        for state in reversed(states):
            if state in target_states:
                count += 1
            else:
                break
        return count

    def _had_focus_before_distractions(self, states: List[str]) -> bool:
        """Check if there was a focus state directly before the current consecutive distractions/idle."""
        if not states:
            return False
        
        # Start from the end and skip consecutive distractions/idle
        distraction_states = {'distraction', 'idle'}
        focus_check_index = len(states)
        
        # Skip consecutive distractions/idle from the end
        for i in range(len(states) - 1, -1, -1):
            if states[i] in distraction_states:
                focus_check_index = i
            else:
                break
        
        # Check if the state directly before the distractions is focus
        if focus_check_index > 0:
            return states[focus_check_index - 1] == 'focus'
        
        return False

    def _detect_work_session_app(self, session_window: List[ActivityBucket]) -> str:
        """Detect the primary app being used in the current work session."""
        if not session_window:
            return ''
        
        app_total_time = {}
        
        for bucket in session_window:
            if bucket.category in ['focus', 'prefocus']:
                # Calculate bucket duration for percentage calculation using unified parsing
                bucket_start = self.parse_datetime(bucket.startTime)
                bucket_end = self.parse_datetime(bucket.endTime)
                bucket_duration_seconds = (bucket_end - bucket_start).total_seconds()
                
                # Get apps usage data from bucket
                apps_data = bucket.apps or {}
                if isinstance(apps_data, dict):
                    for app_name, usage_time in apps_data.items():
                        # Calculate usage percentage for this bucket
                        usage_percentage = usage_time / bucket_duration_seconds if bucket_duration_seconds > 0 else 0
                        # Only count apps with meaningful usage (avoid noise)
                        if usage_percentage >= self.config.WORK_SESSION_APP_THRESHOLD_PERCENTAGE:
                            app_total_time[app_name] = app_total_time.get(app_name, 0) + usage_time
        
        if not app_total_time:
            return ''
        
        # Return app with highest total time usage
        return max(app_total_time.keys(), key=lambda k: app_total_time[k])


def main(start_time_str: str, end_time_str: str, session_window: List[Dict] = None, testing: bool = False) -> None:
    try:
        # Parse timezone-aware datetime using unified utility
        start_time_tz = ActivityWatchService.parse_datetime(start_time_str)
        end_time_tz = ActivityWatchService.parse_datetime(end_time_str)
        

        # Initialize ActivityWatch service
        service = ActivityWatchService(testing=testing)
        
        # Convert session window and sort by startTime if provided
        if session_window:
            # Convert to ActivityBucket objects using dictionary unpacking
            session_window = [ActivityBucket(**bucket) for bucket in session_window]
            # Sort by startTime to ensure chronological order (oldest to newest)
            session_window.sort(key=lambda x: ActivityWatchService.parse_datetime(x.startTime))
        
        # Perform activity analysis
        category, dominant_app, apps, work_session_app = service.analyze_window_activity(
            start_time_tz, end_time_tz, session_window
        )
        
        # Create result using ActivityBucket dataclass with timezone-aware timestamps
        result = ActivityBucket(
            startTime=start_time_str,
            endTime=end_time_str,
            category=category,
            dominantApp=dominant_app if category != 'idle' else None,
            apps=apps,
            workSessionApp=work_session_app if work_session_app else None
        )
        
        # Convert to dict for JSON output
        print(json.dumps(result.__dict__, indent=2))
        
    except Exception as e:
        logger.error(f"Error in main analysis: {e}")
        # Return empty result on error to maintain API contract
        error_result = ActivityBucket(
            startTime=start_time_str if 'start_time_str' in locals() else '',
            endTime=end_time_str if 'end_time_str' in locals() else '',
            category='idle',
            dominantApp=None,
            apps={},
            workSessionApp=None
        )
        print(json.dumps(error_result.__dict__, indent=2))


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Kairo ActivityWatch Processor')
    parser.add_argument('--start', required=True, help='Start time (ISO format)')
    parser.add_argument('--end', required=True, help='End time (ISO format)')
    parser.add_argument('--session-window', type=str, help='Session window data as JSON string')
    parser.add_argument('--testing', action='store_true', help='Use testing buckets')
    
    args = parser.parse_args()
    
    # Parse session window if provided
    session_window = None
    if args.session_window:
        try:
            session_window = json.loads(args.session_window)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse session window JSON: {e}")
            session_window = []
    
    main(args.start, args.end, session_window, args.testing)