// Signals that a prefilled prompt may be an attack on the reader or their AI agent.
//
// Each signal is a plain pattern, so a reader can see why a warning fired. The measured
// precision of each signal, and the datasets behind it, are in src/data/safety/ and
// docs/research/prompt-danger-signals-2026-11-12.md.

export type SafetyTier = 'attack' | 'caution' | 'unreliable'

export interface SafetySignal {
    id: string
    // 'attack': on the measured corpora, at least 99% of matching prompts are malicious, over 50 or more matches.
    // 'caution': a risky action that almost never appears in ordinary shared prompts, with too few
    // matches to measure 99%. Worth reading before sending.
    // 'unreliable': common in attacks and in harmless prompts alike. Measured, never shown as a warning.
    tier: SafetyTier
    title: string
    // Shown beside the warning. Twenty words or fewer.
    explanation: string
    test: (prompt: string) => boolean
}

// Invisible text. Unicode tag characters spell hidden ASCII, bidirectional overrides reorder
// what is displayed, and a run of zero-width characters can encode data. The tag sequences
// inside flag emoji are ordinary text, so they are removed first. A single zero-width
// character is not counted: joiners inside emoji and many scripts use them.
const FLAG_TAGS = /\u{1F3F4}[\u{E0020}-\u{E007E}]+\u{E007F}/gu
const HIDDEN_CHARACTERS = /[\u{E0000}-\u{E007F}\u{202A}-\u{202E}]|[\u{200B}-\u{200D}\u{2060}-\u{2064}\u{FEFF}]{4,}/u

function hasHiddenText(prompt: string) {
    return HIDDEN_CHARACTERS.test(prompt.replace(FLAG_TAGS, ''))
}

const SENSITIVE = String.raw`(?:passwords?|passcodes?|api[ _-]?keys?|access tokens?|tokens?|credentials?|secrets?|private keys?|ssh keys?|seed phrases?|cookies|session ids?|chat history|conversation history|memor(?:y|ies)|contacts|inbox|payment methods?|credit cards?|bank (?:account|details)|medical records?|saved addresses|\.env\b|environment variables)`

const patterns = {
    ignoreInstructions: /\b(?:ignore|disregard|forget|override|bypass|do not follow|don't follow)\b[^.\n]{1,40}\b(?:previous|prior|above|earlier|preceding|foregoing|initial|original|system)\b[^.\n]{1,30}\b(?:instructions?|prompts?|rules?|guidelines?|directions?|directives?|commands?|programming|text|messages?|context)\b/i,
    systemPromptLeak: /\b(?:reveal|show|print|repeat|output|display|leak|give me|tell me|write out|what (?:is|are|were))\b[^.\n]{1,40}\b(?:system prompt|system message|initial (?:prompt|instructions)|(?:your|the) (?:hidden|secret|original|full|exact) (?:prompt|instructions)|prompt above|instructions above)\b/i,
    jailbreakPersona: /\bDAN\b[^.\n]{1,80}\b(?:do anything|no (?:rules|restrictions|limits))|\b(?:do anything now|developer mode enabled|you are (?:now )?jailbroken|jailbreak mode|no (?:ethical|moral) (?:guidelines|restrictions|boundaries)|free of all restrictions|freed from the (?:typical )?confines of ai)\b/i,
    secrecy: /\b(?:do not|don't|never|without)\b[^.\n]{1,30}\b(?:tell|inform|mention|reveal|alert|notify|telling|informing|mentioning|notifying|alerting)\b[^.\n]{1,20}\b(?:the )?(?:user|human|owner|operator)\b/i,
    memoryWrite: /\b(?:remember|memorize|save|store|add|write|update)\b[^.\n]{1,60}\b(?:to|in|into) (?:your |the )?(?:long[- ]term |persistent )?memor(?:y|ies)\b|\b(?:in|for|across) (?:all|every|any) (?:future|subsequent|later|new) (?:conversations?|chats?|sessions?|responses?|threads?)\b/i,
    exfiltrationSend: new RegExp(String.raw`\b(?:send|post|upload|forward|email|e-mail|transmit|exfiltrate|leak|share|submit)\b[^\n]{1,160}\b${SENSITIVE}[^\n]{1,160}\b(?:to|at|via)\b[^\n]{1,40}(?:https?:\/\/|[\w.+-]+@[\w-]+\.[\w.]+)|\b(?:retrieve|get|fetch|read|find|collect|access|download|view|check)\b[^\n]{1,120}\b${SENSITIVE}[^\n]{1,200}\b(?:send|email|e-mail|forward|post|upload|share)\b[^\n]{1,80}(?:https?:\/\/|[\w.+-]+@[\w-]+\.[\w.]+)`, 'i'),
    sendToAddress: /\b(?:send|forward|email|e-mail)\b[^\n]{1,80}\b(?:to|recipient|address)\b[^\n]{1,30}[\w.+-]+@[\w-]+\.[a-z]{2,}/i,
    // An image whose address has a slot to fill, in a prompt that also talks about private data.
    // The slot alone is common: many templates fetch stock photos this way.
    exfiltrationImage: /!\[[^\]]*\]\(https?:\/\/[^)\s]*[?&=/](?:\{[^)}\s]*\}|\[[^)\]\s]*\]|<[^)>\s]*>|%7B)[^)\s]*\)[\s\S]{1,400}\b(?:conversation|chat history|previous messages|memor(?:y|ies)|passwords?|secrets?|api keys?|tokens?|private|personal (?:data|information|details))\b|\b(?:conversation|chat history|previous messages|memor(?:y|ies)|passwords?|secrets?|api keys?|tokens?|private|personal (?:data|information|details))\b[\s\S]{1,400}!\[[^\]]*\]\(https?:\/\/[^)\s]*[?&=/](?:\{[^)}\s]*\}|\[[^)\]\s]*\]|<[^)>\s]*>|%7B)[^)\s]*\)/i,
    encodedPayload: /\b(?:decode|decoded|base64|rot13|hex(?:adecimal)?)\b[^.\n]{1,60}\b(?:and|then)\b[^.\n]{1,30}\b(?:follow|execute|run|obey|do what|carry out|act on)\b|(?:^|[\s"'`(])[A-Z0-9+/]{120,}={1,2}(?:$|[\s"'`)])/im,
    reverseShell: /\/dev\/tcp\/\S+|\bn(?:c|cat|etcat)\b[^\n]{1,80}\s(?:-e|--exec|-c)\s+\S*(?:sh|cmd)|\bmkfifo\b[^\n]{1,120}\bn(?:c|cat)\b|\bsocat\b[^\n]{1,120}\bexec:|\bbash\s+-i\s+>&/i,
    fileUpload: /\bcurl\b[^\n]{1,300}(?:--data-binary|--data-raw|--data|-d|-F|--form|-T|--upload-file)\s+["']?[^\s"']*@["']?[\w$~./{]|\bn(?:c|cat)\b[^\n|]{1,80}<\s*\S+|\bscp\b[^\n]{1,120}\s\S[^\s@]*@\S+:/i,
    remoteCode: /\b(?:curl|wget|iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^\n|;&]{1,300}\|\s*(?:sudo\s+)?(?:env\s+)?(?:ba|z|k|da|fi)?sh\b|\b(?:curl|wget)\b[^\n]{1,300}https?:\/\/\S+\.(?:sh|py|pl|rb|ps1|exe|bin)\b[^\n]{1,200}(?:&&|;|\n)\s*(?:sudo\s+)?(?:ba|z)?sh\s|\b(?:iex|Invoke-Expression)\s*[(\s]|\bbase64\s+(?:-d|--decode)\b[^\n|]*\|\s*(?:sudo\s+)?(?:ba|z)?sh\b|\b(?:python3?|node|perl|ruby)\s+-[ce]\s+["'][^"']{1,400}(?:urlopen|requests\.get|fetch\(|http\.get)/i,
    destructiveCommand: /\brm\s+(?:-[a-z]*\s+)*-[A-QS-Z]*R[A-Z]*\s+(?:-[-\w]+\s+)*["']?(?:\/(?:\s|$|[*"'])|\/(?:etc|usr|var|bin|sbin|boot|lib|sys|root|home|opt|dev|proc|Users|System|Library|Applications)\b|~(?:\/?\s|\/?$|\/\*|\/?["'])|\$HOME\b|\*(?:\s|$))|\bmkfs(?:\.\w+)?\s|\bdd\s+if=\S+\s+of=\/dev\/|:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:|\bgit\s+push\s+(?:\S+\s+)*(?:--force\b|-f\b)|\bgit\s+reset\s+--hard\b|\bDROP\s+(?:TABLE|DATABASE|SCHEMA)\b|\bformat\s+c:|\bdel\s+\/[sqf]/i,
    credentialAccess: /(?:~|\$HOME|\/Users\/\w+|\/home\/\w+|\/root)\/\.(?:ssh|aws|gnupg|kube|docker\/config|netrc|npmrc|pypirc|config\/gcloud|bash_history|zsh_history)\b|\bid_(?:rsa|ed25519|ecdsa)\b|\/etc\/(?:shadow|passwd|sudoers|ssh\/)|\/(?:root|proc\/\d+\/environ|var\/log\/auth)|\b(?:cat|read|print|show|send|upload|copy|open|dump)\b[^.\n]{1,60}(?:\.env\b|\bcredentials\b|\bkeychain\b|\bprivate key\b|\bseed phrase\b|\bwallet\.dat\b|\b[A-Z_]*(?:API_KEY|SECRET|TOKEN|PASSWORD)\b)/,
    approvalBypass: /--dangerously-skip-permissions|--dangerously-bypass-approvals-and-sandbox|--yolo\b|\byolo mode\b|\bauto[- ]?approve (?:all|every|everything)\b|\bdisable\b[^.\n]{1,20}\b(?:the )?(?:sandbox|safety checks?|approval prompts?|permission prompts?)\b/i,
    fakeChatTokens: /<\|(?:im_start|im_end|system|assistant|user|endoftext|end|eot_id|start_header_id)\|>|\[\/?INST\]|<<\/?SYS>>/i,
    systemRoleLine: /<\/?system>|^\s{0,3}(?:#{1,3}\s*)?(?:\[?system(?: message| prompt| override| note)?\]?|developer message|admin override)\s*:/im,
}

export const safetySignals: SafetySignal[] = [
    { id: 'send-to-address', tier: 'attack', title: 'Sends email to a set address', explanation: 'It tells an agent to send email to a specific address. Attackers use this to take your data.', test: prompt => patterns.sendToAddress.test(prompt) },
    { id: 'fake-chat-tokens', tier: 'attack', title: 'Fake system markers', explanation: 'It contains hidden control markers that make the AI think part of the text came from itself.', test: prompt => patterns.fakeChatTokens.test(prompt) },
    { id: 'hidden-text', tier: 'caution', title: 'Hidden text', explanation: 'This prompt contains invisible characters. They can carry instructions you cannot see.', test: hasHiddenText },
    { id: 'image-exfiltration', tier: 'caution', title: 'Leaks data through an image link', explanation: 'It asks the AI to show an image whose web address carries your data to someone else.', test: prompt => patterns.exfiltrationImage.test(prompt) },
    { id: 'credential-access', tier: 'caution', title: 'Reads keys or passwords', explanation: 'It points an agent at files or settings that hold your keys, passwords, or accounts.', test: prompt => patterns.credentialAccess.test(prompt) },
    { id: 'file-upload', tier: 'caution', title: 'Uploads a file from your computer', explanation: 'It includes a command that sends a file from your computer to another machine.', test: prompt => patterns.fileUpload.test(prompt) },
    { id: 'reverse-shell', tier: 'caution', title: 'Opens remote control', explanation: 'It includes a command that lets another computer run commands on yours.', test: prompt => patterns.reverseShell.test(prompt) },
    { id: 'remote-code', tier: 'caution', title: 'Downloads and runs code', explanation: 'It asks an agent to download code from the internet and run it on your computer.', test: prompt => patterns.remoteCode.test(prompt) },
    { id: 'destructive-command', tier: 'caution', title: 'Destructive command', explanation: 'It includes a command that can delete files, wipe a disk, or overwrite shared history.', test: prompt => patterns.destructiveCommand.test(prompt) },
    { id: 'approval-bypass', tier: 'caution', title: 'Turns off confirmations', explanation: 'It asks an agent to act without asking you first, removing your chance to stop a mistake.', test: prompt => patterns.approvalBypass.test(prompt) },
    { id: 'encoded-payload', tier: 'caution', title: 'Encoded instructions', explanation: 'Part of this prompt is encoded, so you cannot read what the AI is being told.', test: prompt => patterns.encodedPayload.test(prompt) },
    { id: 'data-exfiltration', tier: 'unreliable', title: 'Sends private data somewhere', explanation: 'It asks the AI to send passwords, keys, history, or other private data to an outside address.', test: prompt => patterns.exfiltrationSend.test(prompt) },
    { id: 'ignore-instructions', tier: 'unreliable', title: 'Overrides earlier instructions', explanation: 'It tells the AI to ignore earlier instructions. Attackers use this, and so do many ordinary templates.', test: prompt => patterns.ignoreInstructions.test(prompt) },
    { id: 'jailbreak-persona', tier: 'unreliable', title: 'Jailbreak persona', explanation: 'It asks the AI to play a character with no rules, a common way to bypass safety limits.', test: prompt => patterns.jailbreakPersona.test(prompt) },
    { id: 'system-prompt-leak', tier: 'unreliable', title: 'Asks for hidden instructions', explanation: 'It asks the AI to reveal its hidden setup instructions, which attackers use to plan further attacks.', test: prompt => patterns.systemPromptLeak.test(prompt) },
    { id: 'system-role-line', tier: 'unreliable', title: 'Pretends to be the system', explanation: 'It labels part of the text as a system message so the AI gives it more authority.', test: prompt => patterns.systemRoleLine.test(prompt) },
    { id: 'secrecy', tier: 'unreliable', title: 'Tells the AI to hide things from you', explanation: 'It tells the AI not to tell the user something. Role-play prompts do this too.', test: prompt => patterns.secrecy.test(prompt) },
    { id: 'memory-write', tier: 'unreliable', title: 'Changes the AI\'s memory', explanation: 'It asks the AI to remember something for future chats, which can quietly change later answers.', test: prompt => patterns.memoryWrite.test(prompt) },
]

// Signals worth showing to a reader. 'unreliable' ones stay out of the interface.
export function detectSafetySignals(prompt: string): SafetySignal[] {
    return safetySignals.filter(signal => signal.tier !== 'unreliable' && signal.test(prompt))
}
