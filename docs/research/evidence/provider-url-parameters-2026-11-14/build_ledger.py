"""Turn HTTP observations into a reviewable source ledger and compact receipts."""
from pathlib import Path
import collections,hashlib,html,json,re,urllib.parse
ROOT=Path(__file__).resolve().parent
DATE='2026-11-14'

def clean(s):return html.unescape(str(s)).replace('|','\\|').replace('\n',' ').replace('\r',' ')[:450]
def provider(x):
 s=(x['url']+' '+x.get('title','')).lower()
 if 'perplexity' in s:return 'Perplexity'
 if 'gemini' in s or 'bard' in s:return 'Gemini'
 if 'claude' in s or 'anthropic' in s:return 'Claude'
 if 'chatgpt' in s or 'openai' in s or 'codex' in s:return 'ChatGPT'
 return 'Multiple / catalog'
def publisher(u):
 h=urllib.parse.urlsplit(u).netloc
 if h in ['github.com','raw.githubusercontent.com','api.github.com']:
  p=urllib.parse.urlsplit(u).path.split('/')
  if h=='api.github.com' and len(p)>2:return p[2]+' / GitHub'
  return (p[1] if len(p)>1 else h)+' / GitHub'
 return h

# Claims are scoped summaries, not automatic extraction of every parameter-looking string.
NOTES=[
('14886647','Chrome shortcut; HTTP header, not query','Official Chrome shortcut entry; inspected help does not specify a reusable prompt query.','High for Chrome UI; no query proof','date unknown'),
('20001275','Work; models; reasoning','Official Chat/Work separation, model picker, plan and rollout conditions; no query selector specified in inspected text.','High for product availability; no query proof','help says updated 9 days ago'),
('8664678','model; thinking; effort','Official consumer model names and separate effort/thinking controls; no accepted query key contract.','High for UI; no query proof','updated 2026-11-09'),
('12260368','incognito','Official instructions for incognito UI; does not establish URL acceptance.','High for UI; no query proof','updated 2026-10-30'),
('12138966','consumer model availability','Official consumer release notes. Useful for changes and retest triggers, not verified URL slugs.','High for releases; no query proof','updated 2026-11-12'),
('8914046','temporary-chat','Official temporary-chat UI and retention behavior; query switch not specified in inspected text.','High for UI; no query proof','date unknown'),
('6825453','models; thinking; Work','Official release chronology. No substantiated replacement model/Work navigation key found in inspected passages.','High for releases; no query proof','multiple dated entries'),
('9237897','search','Official search help. UI capability does not verify a hints query value.','High for UI; no query proof','date unknown'),
('11780217','study mode','Official study-mode help; useful product context, useless for current URL-key verification.','High for UI; no query proof','date unknown'),
('whtwnd.com/austegard','q; model; thinking; project; attachment; skill-name; mode; incognito; error; spotlight; modal; debug_show_all_prompt_chips','Reverse-engineers new-chat keys; thinking requires compatible explicit model. Incognito description conflicts with newer local observation.','Medium; dated reverse engineering, stale risk','published 2026-02-20'),
('query-parameters-in-chatgpt/1027747','q; prompt; hints=search; temporary-chat; model','Users report query/search/temp support; later comments describe prompt and app mentions. Model failure also reported.','Medium; firsthand forum, scoped dates','2024-11-22 through 2026-01-13'),
('gpt-ing-searching-without-the-plugin','q; hints=search; temporary-chat; model','Historical shortcut recipe lists now-old model values; does not verify current selection.','Medium historical; low for current model support','published 2024-11-17'),
('77309','x-omnibox-gemini; /prompt','Practitioner identifies Chrome header-based prompt transfer; AI Studio query example is a feature request, not proof.','Medium for observed header; no generic URL proof','published 2025-04-03'),
('8435','q; copilot=true','Users verify search query; report copilot broken Feb 2025, repaired, broken again Oct 2025.','Medium; dated firsthand regression history','latest relevant comment 2025-10-02'),
('49508562','q; prompt; model; hints=reason; oai-dm; temporary-chat','Comment explicitly says parameter list came from ChatGPT; excludes list as behavioral evidence.','Low; model-generated list','September 2026; read 2026-11-14'),
('philogene.co.za','hints=search; hints=reason','Undated explanation calls hints frontend suggestions; no current controlled model-selection evidence.','Low; undated, limited method','date unknown'),
('u2l.ai','q','Generator marketing claims automatic submission. Conditions and testing unclear; conflicts with local prefill result.','Low; promotional; excluded from recommendations','date unknown'),
('trevorfox.com','q; prompt; hints=search; temporary-chat; focus; copilot; prompt_text','Named author reports logged-out tests: ChatGPT q sends, prompt prefills; Gemini q/prompt_text ignored; no visible Perplexity focus/copilot effect.','Medium; dated firsthand, logged-out scope','updated 2026-11-13'),
('mir4545','prompt_text; prompt_action=prefill; tool routes','Reports native deep-link failure Jan 12 and prefill recovery Jan 17; derives original technique from another author.','Medium historical; same discovery lineage','published 2026-01-11; update 2026-01-17'),
('tyaperujp01','prompt_text; prompt_action=prefill; tool routes','Original tutorial now has June 2026 failure warning. Older tool and prefill recipes are historical.','Medium; dated correction is consequential','published 2025-12-22; updated 2026-06-04'),
('gemini-url-prompt/','q; prompt','Extension supplies prefill via query keys. Does not demonstrate Google native support.','Medium for extension behavior only','store updated 2026-01-31'),
('quochuydev/gemini-url-launcher','q','Launcher reads query and inserts prompt into Gemini DOM. This is extension-provided behavior.','High for inspected code; no native support proof','repo commit 2026-04-24'),
('chaofz/chatgpt-navigator','prompt; autoSubmit; think; extendedthink','Extension parses hash/URL and operates model UI. Its controls do not prove native query support.','High for code; extension only','repo commit 2026-06-28'),
('MHSEA/openai-chatgpt','model; temporary-chat','Uses DOM automation; README says URL selection stopped but skip logic contradicts blanket statement. Local temp result is newer.','Medium historical; internally inconsistent','repo commit 2025-08-12'),
('Andrej730/chatgpt-query','q; hints=search; model','Public builder emits a URL with requested model. Generation alone does not prove consumer acceptance.','High for generated URL; low for acceptance','repo commit 2025-09-27'),
('HanaokaYuzu/Gemini-API','consumer identifiers; model header','Consumer reverse engineering deprecates static model enum in favor of account discovery. Selection uses headers, not navigation query.','High for inspected code; unofficial backend','identifier file revision 2026-10-01'),
('anxkhn/perplexity-mcp','model; mode; is_incognito; consumer catalog','Consumer client uses authenticated request parameters and tier-aware model discovery. Does not establish navigation query keys.','High for code; unofficial backend, account-dependent','pinned/latest repo revision 2026-11-14'),
('sign-in-with-chatgpt-devkit','subscription catalog; slug','Official loader consumes authenticated model catalog and filters visible entries. Different interface from ChatGPT navigation.','High for code; no URL proof','read 2026-11-14; file date not independently established'),
('model-provider/src/models_endpoint.rs','subscription models','Official Codex model loader, not a consumer Chat navigation contract.','High for code; different interface','read 2026-11-14'),
('models.dev','model metadata','Maintained API/SDK metadata registry; no verified consumer-navigation slug matrix.','High for registry scope; unsuitable URL authority','read 2026-11-14'),
('spullara/models','API model IDs','Registry includes API-only audio, embedding and other IDs. Useless as verification of consumer URL slugs.','Medium registry; unsuitable URL authority','read 2026-11-14'),
('BillZong/codex-models-slug','Codex slugs','Codex-specific slug list; no proof values select a ChatGPT consumer model through URL.','Low for current navigation support','read 2026-11-14'),
('raycast/extensions/main/extensions/perplexity/src/ask-perplexity.tsx','q; perplexity-app://search','Source constructs web /search?q= and desktop-app search?q=. No model, Pro, focus or incognito keys emitted.','High for builder implementation; no live execution','read 2026-11-14'),
('raycast/extensions','models; launcher entry','Inspected extension source/directory. ChatGPT/Claude catalog UI is not proof of native consumer query support.','High for inspected code; limited URL relevance','read 2026-11-14'),
('www.perplexity.ai/opensearch.xml','s=o; q','Live first-party XML advertises /search?s=o&q={searchTerms}. This specifies URL format; UI working result comes from local manual check.','High; live first-party URL declaration','fetched 2026-11-14'),
('claude.ai/opensearch.xml','unknown','Returned an app shell rather than useful OpenSearch evidence. Useless for parameter support.','Unusable for URL contract','seen 2026-11-14'),
('atomicego.com','focus=internet/scholar/youtube/reddit/wolfram/writing; copilot=true','Author describes own shortcut setup and Pro/focus recipes. Historical evidence, no present confirmation.','Medium historical firsthand','published 2024-06-01'),
('forum.popclip.app','q; copilot=true; perplexity://search','Historical launcher recipes and app scheme; no present mode/model verification.','Medium historical implementation report','thread 2023 onward; read 2026-11-14'),
('issues/8827','q','October regression report concerns automatic answering from Claude q URL. Does not disprove newer prefill observation.','Medium historical regression report','opened 2025-10-03'),
('issues/2','q; copilot=true','Search redirect duplication issue contains URL example. Does not verify current Pro activation.','Medium for example; low for mode acceptance','opened 2024-04-15'),
('zenn.dev','q; hints=reason; hints=search','Shortcut recipe offers reason hint. No current Work/model verification.','Low for present reasoning support','date not established'),
('open-webui/docs','URL controls for Open WebUI','Different application; useless for native provider URL support.','High for its own app; excluded here','seen 2026-11-14'),
('KudoAI/chatgpt.js','client models and backend','Consumer-client implementation lead. Inspected code does not supply a current public navigation-slug registry.','Medium; unofficial client; no query proof','read 2026-11-14'),
('ThatGuySam/prefillprompt','current builder','Same repository under investigation; not independent corroboration.','Context only; circular evidence excluded','read 2026-11-14'),
]

def annotate(x):
 u=x['url'];t=x.get('text','');status=x.get('status')
 note=next((v[1:] for v in NOTES if v[0] in u),None)
 if note:params,claim,rating,date=note
 else:params,claim,rating,date='none established','Useless for this question: screened retrieved content does not establish a consumer navigation parameter.','Low relevance; no support used','publication unknown'
 if '/git/trees/' in u or '/contents' in u:
  params='repository discovery';claim='Public file/directory inventory used to locate source files. Does not verify parameters.';rating='Discovery metadata only';date='fetched 2026-11-14'
 if '/commits?' in u:
  params='source revision date';rating='High for commit metadata only';date='fetched 2026-11-14';claim='Public commit metadata used to date source revision; activity alone does not verify working behavior.'
 if status!=200:access=f'HTTP {status}; unavailable';claim='Unavailable on direct GET. '+claim;rating='Unusable body; '+rating
 elif t.strip() in ('Reddit','ChatGPT','‎Google Gemini') or 'Prove your humanity' in t[:500] or ('Sign in - Google Accounts' in t[:80]):
  access='HTTP 200; shell/challenge/sign-in, no usable original text';claim='Useless response for verification. Discovery snippet, if any, remains unverified.';rating='Unusable body'
 else:access='HTTP 200; body screened'
 if x.get('title','').startswith('Signed-out'):
  params=urllib.parse.urlsplit(u).query;rating='High for transport observation only'
  claim='Signed-out GET preserved destination URL and returned an app shell; no client execution or parameter acceptance observed.'
  if 'perplexity' in u:claim='Redirected to /search/new with query intact, then 403. No challenge bypass and no acceptance inference.'
  access=f'HTTP {status}; transport only'
 return dict(parameters=params,claim=claim,reliability=rating,date=date,access=access)

def main():
 files=[ROOT/n for n in ['http-observations.json','additional-observations.json','code-observations.json','followup-observations.json','catalog-observations.json']]
 rows=[]
 for f in files:
  if f.exists():rows+=json.loads(f.read_text())
 byurl={x['url']:x for x in rows};rows=list(byurl.values())
 for x in rows:
  if 'assessment' not in x:x['assessment']=annotate(x)
 def canonical(u):
  p=urllib.parse.urlsplit(u)
  return urllib.parse.urlunsplit((p.scheme,p.netloc,p.path.rstrip('/'),'',''))
 canonical_all=len({canonical(x['url']) for x in rows})
 source_rows=[x for x in rows if not x['url'].startswith('https://api.github.com/') and not x.get('title','').startswith('Signed-out')]
 canonical_sources=len({canonical(x['url']) for x in source_rows})
 counts=collections.Counter(str(x.get('status')) for x in rows)
 useful=sum(x['assessment']['access']=='HTTP 200; body screened' for x in rows)
 skill=Path('/Users/athena/Code/notes-search/.agents/skills/sams-research/SKILL.md')
 skillhash=hashlib.sha256(skill.read_bytes()).hexdigest()
 lines=['# Source ledger for provider URL parameters','',f'Research date: {DATE}. Run `pp-url-20261114-84c93a7f`.','',f'Checked **{len(rows)} distinct URL strings**, representing **{canonical_all} distinct links after removing queries, fragments and trailing slashes**. Conservatively excluding GitHub API discovery/commit helper requests and destination probes leaves **{canonical_sources} distinct source links**. These counts include unavailable and useless sources. They are not counts of working links or independent confirmations.','',f'HTTP statuses: {dict(counts)}. {useful} responses had screenable bodies; the other responses were unavailable, shells, challenges or transport-only probes. A screenable body is not necessarily relevant.','',f'Research skill SHA-256: `{skillhash}`. Source-priority reference read first. Only public, signed-out GETs; no browser, credentials, sign-in, challenge solving or client execution.','', 'Reliability is claim-specific. High for code means the implementation was read, not that the remote app honors its URLs. Medium historical reports need retesting. Low or unusable entries do not support recommendations. All sources were seen on 2026-11-14; publication dates are stated only when identifiable. Dates extracted from arbitrary page assets were not treated as publication dates.','', '## Checked sources and HTTP observations','', '| ID | URL | Title | Publisher | Date seen or published | Provider | Parameter(s) | What it claims / disposition | Reliability | Access |','| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |']
 for i,x in enumerate(rows,1):
  a=x['assessment'];title=x.get('page_title') or x.get('title') or 'Untitled'
  if x['url'].startswith('https://api.github.com/'):title=x.get('title','GitHub API metadata')
  fields=[f'S{i:03}',f"[Source]({x['url']})",title,publisher(x['url']),a['date']+'; seen '+DATE,provider(x),a['parameters'],a['claim'],a['reliability'],a['access']]
  lines.append('| '+' | '.join(clean(y) for y in fields)+' |')
 # Preserve screened discovery leads separately. Do not add them to the checked-link count.
 discovery=json.loads((ROOT/'discovery.json').read_text())
 rest=[x for x in discovery if x['url'] not in byurl]
 lines+=['','## Discovery-only results, excluded from checked-link count','', 'These URLs appeared in search output or were considered as leads. Their original source bodies were not inspected in the HTTP collection. They remain unverified and are recorded to prevent rediscovery loops. Search snippets were not used to establish the memo\'s consequential claims.','', '| URL | Title | Publisher | Date seen or published | Provider | Parameter(s) | What it claims / disposition | Reliability |','| --- | --- | --- | --- | --- | --- | --- | --- |']
 for x in rest:
  date=x.get('discovery_date','publication unknown')
  if 'discovery' in x:
   m=re.search(r'Published: ([^;\n]+)',x['discovery']);date='search index says '+m.group(1) if m else 'publication unknown'
  fields=[f"[Lead]({x['url']})",x['title'],publisher(x['url']),date+'; seen '+DATE,provider(x),'not established','Unverified discovery lead; original not read; no support used.','Unusable as claim evidence']
  lines.append('| '+' | '.join(clean(y) for y in fields)+' |')
 (ROOT/'sources.md').write_text('\n'.join(lines)+'\n')
 # Keep receipts, not copies of complete third-party pages. Hashes cover the retrieved response bytes.
 compact=[]
 for x in rows:
  compact.append({k:v for k,v in x.items() if k not in ('text','discovery','dates')})
 (ROOT/'http-observations.json').write_text(json.dumps(compact,ensure_ascii=False,indent=2)+'\n')
 for f in files[1:]:
  if f.exists():f.unlink()
 for x in discovery:
  d=x.pop('discovery','')
  m=re.search(r'Published: ([^;\n]+)',d)
  if m:x['discovery_date']='search index says '+m.group(1)
 (ROOT/'discovery.json').write_text(json.dumps(discovery,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'counts.json').write_text(json.dumps(dict(distinct_urls=len(rows),normalized_links=canonical_all,normalized_sources_excluding_helpers_and_probes=canonical_sources,screenable_bodies=useful,http_statuses=dict(counts),discovery_only=len(rest),skill_sha256=skillhash),indent=2)+'\n')
 print((ROOT/'counts.json').read_text())

if __name__=='__main__':main()
