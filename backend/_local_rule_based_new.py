async def _local_rule_based(user_message: str) -> AsyncGenerator[str, None]:
    # Detect greetings and identity questions
    msg_lower = user_message.lower()
    if any(x in msg_lower for x in ["hello", "hi", "hey", "who are you", "name", "model", "what are you"]):
        text = "I am MediBot, your medical triage assistant. I'm currently running in offline/fallback mode. How can I help you today?"
        for chunk in text.split():
            yield chunk + " "
            await asyncio.sleep(0)
        return

    severity = _detect_severity(user_message)
    dataset_context = _match_symptoms(user_message)

    text = (
        f"# Overview\n\n"
        f"{dataset_context}\n"
        f"## General Advice\n"
        f"- Stay hydrated, rest well, and monitor your symptoms.\n"
        f"- Over-the-counter pain relievers may help for mild discomfort.\n"
        f"- Avoid self-medicating antibiotics.\n\n"
        f"> Disclaimer: {SYSTEM_DISCLAIMER}\n"
    )

    for chunk in text.split():
        yield chunk + " "
        await asyncio.sleep(0)
