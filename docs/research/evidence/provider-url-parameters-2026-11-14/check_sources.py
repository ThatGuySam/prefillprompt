"""Public, signed-out HTTP inspection. No browser, cookies, retries or challenges bypassed."""
import concurrent.futures
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent

class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'svg'): self.skip += 1
    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'svg'): self.skip = max(0, self.skip - 1)
    def handle_data(self, data):
        if not self.skip and data.strip(): self.parts.append(data.strip())

def canonical(url):
    u = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit((u.scheme, u.netloc, u.path.rstrip('/'), '', ''))

def score(row):
    u, title = row['url'], row['title']
    if re.search(r'\.pdf(?:\?|$)|wikipedia|t\.co/|cnmirror|masuit|upd\.dev|core-directive|git-disabled|gogafonn', u): return -100
    if re.search(r'help.openai.com/en/|support.claude.com/en/|support.google.com/gemini/answer|perplexity.ai/(help-center|changelog)|chromium|models.dev|gemini.google.com/updates', u): return 100
    if re.search(r'github.com/(KudoAI|HanaokaYuzu|dsdanielpark|xtekky|raycast|0xW01F|lencx|austegard|anomalyco|quochuydev|MHSEA|chaofz)', u): return 95
    if re.search(r'query|parameter|deep.link|prompt.link|URL|search.engine|Search.URL|Temporary.Chat.by.Default|Pro.*switch|Pro.*Search.Display|q\?prompt|Integrating.Perplexity|url.switching|custom.search.engine',title,re.I): return 90
    if 'github.com' in u: return 60
    if re.search(r'anthropic.com|perplexity.ai|academy.claude.com|discuss.ai.google|community.openai|popclip|note.com|zenn.dev|atomicego', u): return 70
    if re.search(r'techradar|tomsguide|windowscentral|manuals.plus|cloudfront|arxiv|openreview|huggingface|research|cdn-|website-files',u): return -20
    return 10

def fetch(row):
    result = dict(row)
    try:
        req = urllib.request.Request(row['url'], headers={'User-Agent': 'PrefillPrompt-evidence-research/1.0 (public HTTP source inspection)'})
        with urllib.request.urlopen(req, timeout=18) as response:
            raw = response.read(3_000_000)
            result.update(status=response.status, final_url=response.url, content_type=response.headers.get('content-type',''), sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw))
            data = raw.decode('utf-8', errors='replace')
            parser = Text()
            parser.feed(data)
            body = '\n'.join(parser.parts) if 'html' in result['content_type'] else data
            result['text'] = body[:250000]
            result['page_title'] = re.sub('<[^>]+>','', next(iter(re.findall(r'<title[^>]*>(.*?)</title>',data,re.S)),row['title']))
            result['dates'] = re.findall(r'20(?:2[3-6])[-/]\d\d[-/]\d\d', data)[:12]
    except urllib.error.HTTPError as error:
        result.update(status=error.code, final_url=error.url, error=str(error), text='')
    except Exception as error:
        result.update(status='error', error=str(error), text='')
    return result

if __name__ == '__main__':
    rows = json.loads((ROOT/'discovery.json').read_text())
    chosen, seen = [], set()
    for row in sorted(rows,key=score,reverse=True):
        key = canonical(row['url'])
        if key in seen: continue
        seen.add(key)
        chosen.append(row)
        if len(chosen) == 135: break
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        results = list(pool.map(fetch,chosen))
    # A repeat probe must not overwrite the reviewed, combined research receipt.
    (ROOT/'latest-probe.json').write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'attempted':len(results),'http_200':sum(x.get('status')==200 for x in results),'status_counts':{str(s):sum(x.get('status')==s for x in results) for s in set(x.get('status') for x in results)}},indent=2))
