require('dotenv').config();
const pool = require('../config/db');


const seedCategories = async () => {
    try {
        const categories = [
      'Food',
      'Gas',
      'Drinks',
      'Rent',
      'Internet',
      'Insurance',
      'Fitness',
      'Clothing',
      'Entertainment',
      'Healthcare',
      'Travel',
      'Miscellaneous',
      'Utilities',
      'Groceries',
    ];

        for (const name of categories) {
            await pool.query('INSERT INTO categories (name, is_default) VALUES ($1, $2)', [name, true]);
        }

        console.log('Categories seeded successfully');
    } catch (err) {
        console.error('Error seeding categories:', err);
    } finally {
        pool.end();
    }
};

seedCategories();   