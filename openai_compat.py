from openai import AsyncOpenAI


async def generate_text(
    client: AsyncOpenAI,
    *,
    system_prompt: str,
    user_prompt: str,
    model: str = 'gpt-4.1-mini',
) -> str:
    """
    Compatibility wrapper:
    - Uses responses API when available.
    - Falls back to chat.completions for older SDK shapes.
    """
    if hasattr(client, 'responses'):
        response = await client.responses.create(
            model=model,
            input=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt},
            ],
        )
        return (response.output_text or '').strip()

    completion = await client.chat.completions.create(
        model=model,
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ],
    )
    return (completion.choices[0].message.content or '').strip()
