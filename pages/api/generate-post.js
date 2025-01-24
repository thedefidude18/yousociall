import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Store your OpenAI API key in .env
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { prompt } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Use GPT-3.5 or GPT-4
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates social media posts about web3 and blockchain technology.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 200, // Limit the length of the generated post
    });

    const content = completion.choices[0].message.content;
    res.status(200).json({ content });
  } catch (error) {
    console.error('Error generating post:', error);
    res.status(500).json({ message: 'Failed to generate post' });
  }
}