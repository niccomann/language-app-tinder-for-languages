"""
YouTube API Service for fetching short educational videos
"""
import logging
from typing import Optional, Dict, Any
import httpx
from app.core.config import config

log = logging.getLogger(__name__)


class YouTubeService:
    """Service for interacting with YouTube Data API v3"""
    
    BASE_URL = "https://www.googleapis.com/youtube/v3"
    
    def __init__(self):
        self.api_key = config.server.youtube_api_key
        if not self.api_key:
            log.warning("YouTube API key not configured. Video search will not work.")
    
    async def search_short_video(
        self, 
        word: str, 
        translation: str,
        language: str = "de"
    ) -> Optional[Dict[str, Any]]:
        """
        Search for a short educational video about a word
        
        Args:
            word: The word in the target language (e.g., "Hund")
            translation: The word in English (e.g., "dog")
            language: Language code (default: "de" for German)
            
        Returns:
            Dictionary with video info or None if not found
        """
        if not self.api_key:
            log.error("Cannot search videos: YouTube API key not configured")
            return None
        
        # Build search query
        # Try multiple query variations for better results
        queries = [
            f"German word {word} {translation} learn",
            f"{word} {translation} German short",
            f"learn German {word}",
        ]
        
        for query in queries:
            log.info(f"Searching YouTube for: {query}")
            video = await self._search_videos(query)
            if video:
                return video
        
        log.warning(f"No suitable video found for word: {word}")
        return None
    
    async def search_multiple_videos(
        self,
        word: str,
        translation: str,
        language: str = "de",
        limit: int = 8
    ) -> list[Dict[str, Any]]:
        """
        Search for multiple short educational videos about a word
        
        Args:
            word: The word in the target language (e.g., "Hund")
            translation: The word in English (e.g., "dog")
            language: Language code (default: "de" for German)
            limit: Maximum number of videos to return (default: 8)
            
        Returns:
            List of video info dictionaries
        """
        if not self.api_key:
            log.error("❌ Cannot search videos: YouTube API key not configured")
            return []
        
        log.info(f"🔍 Starting search for: {word} ({translation}) - limit: {limit}")
        
        # Build search queries with variations
        queries = [
            f"German word {word} {translation} learn",
            f"{word} {translation} German tutorial",
            f"learn German {word}",
            f"{translation} in German {word}",
        ]
        
        all_videos = []
        seen_video_ids = set()
        
        for query in queries:
            if len(all_videos) >= limit:
                break
                
            log.info(f"📺 Query {len(all_videos)+1}: {query}")
            videos = await self._search_multiple_videos(query, max_results=limit - len(all_videos))
            log.info(f"   Found {len(videos)} videos from this query")
            
            # Add unique videos only
            for video in videos:
                if video["video_id"] not in seen_video_ids:
                    all_videos.append(video)
                    seen_video_ids.add(video["video_id"])
                    log.info(f"   ✅ Added: {video['title'][:50]}...")
                    
                if len(all_videos) >= limit:
                    break
        
        log.info(f"Found {len(all_videos)} videos for word: {word}")
        return all_videos
    
    async def _search_videos(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Perform YouTube search with filters for short videos
        
        Args:
            query: Search query string
            
        Returns:
            Video info dict or None
        """
        try:
            async with httpx.AsyncClient() as client:
                # Search for videos
                search_params = {
                    "part": "snippet",
                    "q": query,
                    "type": "video",
                    "videoDuration": "short",  # Videos < 4 minutes
                    "maxResults": 5,  # Get top 5 to filter further
                    "order": "relevance",
                    "key": self.api_key,
                    "relevanceLanguage": "en",  # Prefer English or German content
                }
                
                search_response = await client.get(
                    f"{self.BASE_URL}/search",
                    params=search_params,
                    timeout=10.0
                )
                search_response.raise_for_status()
                search_data = search_response.json()
                
                if not search_data.get("items"):
                    return None
                
                # Get video IDs to fetch duration details
                video_ids = [item["id"]["videoId"] for item in search_data["items"]]
                
                # Fetch video details to get exact duration
                videos_params = {
                    "part": "contentDetails,snippet",
                    "id": ",".join(video_ids),
                    "key": self.api_key,
                }
                
                videos_response = await client.get(
                    f"{self.BASE_URL}/videos",
                    params=videos_params,
                    timeout=10.0
                )
                videos_response.raise_for_status()
                videos_data = videos_response.json()
                
                # Filter for videos under 60 seconds
                for video in videos_data.get("items", []):
                    duration = video["contentDetails"]["duration"]
                    duration_seconds = self._parse_duration(duration)
                    
                    if duration_seconds and duration_seconds <= 60:
                        log.info(f"Found suitable video: {video['snippet']['title']} ({duration_seconds}s)")
                        return {
                            "video_id": video["id"],
                            "title": video["snippet"]["title"],
                            "thumbnail": video["snippet"]["thumbnails"]["high"]["url"],
                            "duration": duration_seconds,
                            "channel": video["snippet"]["channelTitle"],
                        }
                
                # If no video under 60s, return the shortest one
                if videos_data.get("items"):
                    shortest = min(
                        videos_data["items"],
                        key=lambda v: self._parse_duration(v["contentDetails"]["duration"]) or 999
                    )
                    duration_seconds = self._parse_duration(shortest["contentDetails"]["duration"])
                    log.info(f"Using shortest available video: {shortest['snippet']['title']} ({duration_seconds}s)")
                    return {
                        "video_id": shortest["id"],
                        "title": shortest["snippet"]["title"],
                        "thumbnail": shortest["snippet"]["thumbnails"]["high"]["url"],
                        "duration": duration_seconds,
                        "channel": shortest["snippet"]["channelTitle"],
                    }
                
                return None
                
        except httpx.HTTPError as e:
            log.error(f"HTTP error while searching YouTube: {e}")
            return None
        except Exception as e:
            log.error(f"Unexpected error while searching YouTube: {e}")
            return None
    
    async def _search_multiple_videos(self, query: str, max_results: int = 5) -> list[Dict[str, Any]]:
        """
        Perform YouTube search and return multiple videos
        
        Args:
            query: Search query string
            max_results: Maximum number of videos to return
            
        Returns:
            List of video info dictionaries
        """
        try:
            async with httpx.AsyncClient() as client:
                # Search for videos
                search_params = {
                    "part": "snippet",
                    "q": query,
                    "type": "video",
                    "videoDuration": "short",
                    "maxResults": max_results * 2,  # Get more to filter
                    "order": "relevance",
                    "key": self.api_key,
                    "relevanceLanguage": "en",
                }
                
                search_response = await client.get(
                    f"{self.BASE_URL}/search",
                    params=search_params,
                    timeout=10.0
                )
                search_response.raise_for_status()
                search_data = search_response.json()
                
                if not search_data.get("items"):
                    return []
                
                # Get video IDs
                video_ids = [item["id"]["videoId"] for item in search_data["items"]]
                
                # Fetch video details
                videos_params = {
                    "part": "contentDetails,snippet",
                    "id": ",".join(video_ids),
                    "key": self.api_key,
                }
                
                videos_response = await client.get(
                    f"{self.BASE_URL}/videos",
                    params=videos_params,
                    timeout=10.0
                )
                videos_response.raise_for_status()
                videos_data = videos_response.json()
                
                # Collect videos with duration info
                result_videos = []
                for video in videos_data.get("items", []):
                    duration = video["contentDetails"]["duration"]
                    duration_seconds = self._parse_duration(duration)
                    
                    if duration_seconds and duration_seconds <= 180:  # Max 3 minutes
                        result_videos.append({
                            "video_id": video["id"],
                            "title": video["snippet"]["title"],
                            "thumbnail": video["snippet"]["thumbnails"]["high"]["url"],
                            "duration": duration_seconds,
                            "channel": video["snippet"]["channelTitle"],
                        })
                    
                    if len(result_videos) >= max_results:
                        break
                
                return result_videos
                
        except httpx.HTTPError as e:
            log.error(f"❌ HTTP error while searching YouTube: {e}")
            log.error(f"   Status: {e.response.status_code if hasattr(e, 'response') else 'N/A'}")
            log.error(f"   Response: {e.response.text[:200] if hasattr(e, 'response') else 'N/A'}")
            return []
        except Exception as e:
            log.error(f"❌ Unexpected error while searching YouTube: {e}")
            import traceback
            log.error(traceback.format_exc())
            return []
    
    @staticmethod
    def _parse_duration(duration_str: str) -> Optional[int]:
        """
        Parse ISO 8601 duration format to seconds
        
        Args:
            duration_str: Duration in ISO 8601 format (e.g., "PT1M30S")
            
        Returns:
            Duration in seconds or None if parsing fails
        """
        try:
            # Remove PT prefix
            duration_str = duration_str.replace("PT", "")
            
            hours = 0
            minutes = 0
            seconds = 0
            
            # Parse hours
            if "H" in duration_str:
                hours_str, duration_str = duration_str.split("H")
                hours = int(hours_str)
            
            # Parse minutes
            if "M" in duration_str:
                minutes_str, duration_str = duration_str.split("M")
                minutes = int(minutes_str)
            
            # Parse seconds
            if "S" in duration_str:
                seconds_str = duration_str.replace("S", "")
                seconds = int(seconds_str)
            
            total_seconds = hours * 3600 + minutes * 60 + seconds
            return total_seconds
            
        except Exception as e:
            log.error(f"Error parsing duration '{duration_str}': {e}")
            return None


# Singleton instance
youtube_service = YouTubeService()
