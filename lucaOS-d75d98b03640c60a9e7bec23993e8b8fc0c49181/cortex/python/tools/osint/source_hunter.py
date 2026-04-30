import asyncio
import subprocess
from typing import Optional, List
from urllib.parse import urlparse

class SourceHunter:
    """
    Autonomous Source Code Discovery.
    Uses heuristic guessing and 'git ls-remote' to find public repos for a target.
    """
    
    def __init__(self):
        self.platforms = ["github.com", "gitlab.com"]

    async def find_repo(self, target_url: str) -> Optional[str]:
        """
        Attempts to find the public source code for a given target URL.
        Strategy:
        1. Heuristic Guessing (Fast)
        2. Web Search / Dorking (Deep)
        """
        domain = urlparse(target_url).netloc
        if not domain:
            domain = target_url
            
        # 1. Generate Candidates (Heuristic)
        candidates = self._generate_candidates(domain)
        
        # 2. Check Candidates
        print(f"[*] SourceHunter: Checking {len(candidates)} heuristic candidates...")
        for url in candidates:
            if await self._check_git_remote(url):
                print(f"[+] SourceHunter: FOUND REPO (Heuristic)! {url}")
                return url
        
        # 3. Web Search Fallback (Dorking)
        print(f"[*] SourceHunter: Heuristics failed. Engaging Web Search Dorks...")
        searched_repo = await self._search_repo_web(domain)
        if searched_repo:
            print(f"[+] SourceHunter: FOUND REPO (Web Search)! {searched_repo}")
            return searched_repo
                
        print("[-] SourceHunter: No public repo found.")
        return None

    async def _search_repo_web(self, domain: str) -> Optional[str]:
        """
        Uses DuckDuckGo HTML search to actively find the repo.
        Queries:
        - site:github.com "domain"
        """
        import requests
        import re
        
        # DuckDuckGo HTML (No API Key needed, lightweight)
        query = f'site:github.com "{domain}"'
        url = f"https://html.duckduckgo.com/html/?q={query}"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Luca/1.0'}
        
        try:
            # We run this in a thread executor to avoid blocking async loop
            loop = asyncio.get_event_loop()
            resp = await loop.run_in_executor(None, lambda: requests.get(url, headers=headers, timeout=10))
            
            if resp.status_code == 200:
                html = resp.text
                # Find GitHub URLs in results
                # DDG result links: class="result__a" href="..."
                # Simple regex for github links
                matches = re.findall(r'https://github\.com/[\w-]+/[\w\.-]+', html)
                
                for match in matches:
                    # Clean the URL (remove trailing query params if any)
                    clean_url = match.split('?')[0]
                    if clean_url.endswith('.git'):
                        clean_url = clean_url[:-4]
                        
                    # Ignore 'github.com/site/terms' etc
                    if any(x in clean_url for x in ['/site/', '/blog/', '/topics/', '/search']):
                        continue
                        
                    # Verify it's a real repo
                    # (We append .git for the check method, though git ls-remote handles checking)
                    check_url = clean_url if clean_url.endswith('.git') else f"{clean_url}.git"
                    
                    if await self._check_git_remote(check_url):
                         return check_url
                         
        except Exception as e:
            print(f"[-] Web Search Error: {e}")
            
        return None

    def _generate_candidates(self, domain: str) -> List[str]:
        """
        Generates likely GitHub URLs based on domain name.
        example.com -> github.com/example/example
        app.startup.io -> github.com/startup/app
        """
        # Clean domain
        parts = domain.split('.')
        if len(parts) < 2: 
            return []
            
        # extract name (example.com -> example)
        # simplistic: take the second to last part usually (google.co.uk is hard, but simple logic for now)
        name = parts[-2] 
        tld = parts[-1]
        
        # Variations
        guesses = []
        
        # Organization guessing
        orgs = [name, f"{name}-{tld}", f"{name}HQ", f"{name}-inc"]
        
        # Repo guessing
        repos = [name, "backend", "frontend", "server", "core", "platform", "app", f"{name}.com"]
        
        for org in orgs:
            for repo in repos:
                 guesses.append(f"https://github.com/{org}/{repo}.git")
                 
        return guesses

    async def _check_git_remote(self, git_url: str) -> bool:
        """
        Checks if a git repo exists and is accessible using 'git ls-remote'.
        This is lightweight and doesn't require downloading the code.
        """
        try:
            # Run git ls-remote with a timeout
            process = await asyncio.create_subprocess_exec(
                "git", "ls-remote", git_url,
                stdout=asyncio.subprocess.DEVNULL, # We only care if it succeeds
                stderr=asyncio.subprocess.DEVNULL
            )
            try:
                await asyncio.wait_for(process.wait(), timeout=3.0)
            except asyncio.TimeoutError:
                process.kill()
                return False
                
            return process.returncode == 0
            
        except Exception:
            return False

source_hunter = SourceHunter()
