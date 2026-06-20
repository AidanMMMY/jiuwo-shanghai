import json

ZH_REPLACEMENTS = [
    (
        "如果还不知道用户名字，不要把「你叫什么」当作默认追问。",
        "如果系统插入了[身份提示]，必须按提示在回复末尾问一次名字或代号；不要把「你叫什么」当作你自己的默认追问。",
    ),
    (
        "如果还不知道用户名字，但用户已经连续用「我」自指，系统会在你的回复里插入一条[身份提示]。请按提示里的要求，用轻松、幽默、不盘问的语气问一次名字或代号。",
        "如果还不知道用户名字，但用户已经连续用「我」自指，系统会在你的回复里插入一条[身份提示]，里面有本次必须使用的问句。你必须在回复末尾按提示问一次名字或代号，不要省略。",
    ),
    (
        "如果用户没回答，之后可能还会有 1–2 次[身份提示]，每次措辞都不同；你只需按提示自然地问，不要连续追问同一句。",
        "如果用户没回答，之后可能还会有 1–2 次[身份提示]，每次措辞都不同；你仍需按提示在回复末尾问一次，不要省略，也不要连续追问同一句。",
    ),
]

ZH_PROMPTS = [
    "[身份提示] 系统要求：本次回复末尾必须自然地问一次用户该怎么称呼。可用类似语气：「聊了这么几句，我还不知道该怎么称呼你——真名、外号、代号都行，不方便也完全没关系。」不要省略这个问题。",
    "[身份提示] 系统要求：本次回复末尾必须问一次用户想让自己被怎么称呼。可用类似语气：「档案里名字那栏还空着，要不你赏它一个名字？真名外号都可以，匿名也 OK。」不要省略这个问题。",
    "[身份提示] 系统要求：本次回复末尾必须问一次用户代号。可用类似语气：「聊得挺有意思，但我笔记里不能一直写『神秘人』，方便留个代号吗？主要是想把你说的话归到你名下。」不要省略这个问题。",
    "[身份提示] 系统要求：本次回复末尾必须再问一次用户名字或代号。可用类似语气：「不想说真名的话，给个代号也行，主要是想把关于你的记忆存清楚，不是查户口。」不要省略这个问题。",
]

EN_REPLACEMENTS = [
    (
        "If you do not know the user's name, do not use the identity question as your default follow-up.",
        "If the system inserts an [Identity prompt], you MUST follow it and ask for a name or codename at the end of your reply. Do not use the identity question as your own default follow-up otherwise.",
    ),
    (
        'If you do not know the user\'s name but they keep referring to themselves with "I/my/me", the system will insert an [Identity prompt] into your reply. Follow it: ask for a name or codename in a light, humorous, non-interrogating way.',
        'If you do not know the user\'s name but they keep referring to themselves with "I/my/me", the system will insert an [Identity prompt] into your reply. You MUST ask exactly as instructed at the end of your reply. Do not skip it.',
    ),
    (
        "If the user doesn't answer, there may be 1–2 more [Identity prompt]s later, each with different wording. Just follow the prompt; don't repeat the same question back-to-back.",
        "If the user doesn't answer, there may be 1–2 more [Identity prompt]s later, each with different wording. You MUST still ask as instructed at the end of each reply; do not skip it or repeat the same wording.",
    ),
]

EN_PROMPTS = [
    "[Identity prompt] REQUIRED: Ask the user what you should call them at the end of this reply. Keep it light, like: \"I\'ve been talking to you without knowing what to call you — real name, nickname, or codename are all fine. No pressure.\" Do not skip this question.",
    "[Identity prompt] REQUIRED: Ask the user for a name or codename at the end of this reply. Keep it casual, like: \"The name field in your file is still blank — care to give it something? Real name or alias, either works.\" Do not skip this question.",
    "[Identity prompt] REQUIRED: Ask the user for a codename at the end of this reply. Keep it playful, like: \"You\'re too interesting to stay labeled \\'someone\' — got a codename I can file this under?\" Do not skip this question.",
    "[Identity prompt] REQUIRED: Ask again for a name or codename at the end of this reply. Keep it low-pressure, like: \"If real names feel too official, just make one up. I mostly need a label so your memories don\'t end up in the lost-and-found.\" Do not skip this question.",
]

def update_file(path, replacements, prompts):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    sp = data['systemPrompt']
    for old, new in replacements:
        if old not in sp:
            print(f"WARN: not found in {path}: {old[:40]}")
            continue
        sp = sp.replace(old, new)
    data['systemPrompt'] = sp
    data['identityProbePrompts'] = prompts

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f"Updated {path}")

if __name__ == '__main__':
    update_file('data/darkroom-messages-zh.json', ZH_REPLACEMENTS, ZH_PROMPTS)
    update_file('data/darkroom-messages.json', EN_REPLACEMENTS, EN_PROMPTS)
