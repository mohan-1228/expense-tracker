const pool = require('../config/db');

const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE user_id IS NULL OR user_id = $1 ORDER BY name',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const createCategory = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO categories (name, user_id, is_default) VALUES ($1, $2, false) RETURNING *',
      [name.trim(), userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteCategory = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found or you do not have permission to delete it' });
    }
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getCategories, createCategory, deleteCategory };
