const { askPenny } = require('../services/pennyChat');

const chatWithPenny = async (req, res) => {
  const { message, history } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ message: 'A message is required' });
  }

  try {
    const reply = await askPenny(req.user.id, Array.isArray(history) ? history : [], message.trim());
    res.json({ reply });
  } catch (err) {
    console.error('Error in Penny chat:', err);
    res.status(500).json({ message: "Penny couldn't respond right now. Please try again." });
  }
};

module.exports = { chatWithPenny };
