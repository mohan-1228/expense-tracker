const pool = require('../config/db');

const createTemplate = async (req, res) => {
  const { category_id, amount, name, frequency, next_occurrence, description } = req.body;
  const user_id = req.user.id;

  if (!amount || !name || !frequency || !next_occurrence) {
    return res.status(400).json({ message: 'amount, name, frequency, and next_occurrence are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO recurring_templates
         (user_id, category_id, amount, name, frequency, next_occurrence, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, category_id, amount, name, frequency, next_occurrence, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


const getTemplates = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM recurring_templates WHERE user_id = $1 ORDER BY next_occurrence`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


const updateTemplate = async (req, res) => {
  const { id } = req.params;
  const { category_id, amount, name, frequency, next_occurrence, description } = req.body;

  try {
    const result = await pool.query(
      `UPDATE recurring_templates
       SET category_id = $1, amount = $2, name = $3, frequency = $4, next_occurrence = $5, description = $6
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [category_id, amount, name, frequency, next_occurrence, description, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


const deactivateTemplate = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE recurring_templates
       SET is_active = false
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ message: 'Template deactivated', template: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createTemplate, getTemplates, updateTemplate, deactivateTemplate };
