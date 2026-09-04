exports.up = (pgm) => {
  pgm.createTable('recurring_templates', {
    id: 'id', // shorthand for SERIAL PRIMARY KEY
    user_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'CASCADE' },
    category_id: { type: 'integer', references: 'categories', onDelete: 'SET NULL' },
    amount: { type: 'numeric(10, 2)', notNull: true },
    name: { type: 'varchar(100)', notNull: true },
    frequency: { type: 'varchar(50)', notNull: true },
    next_occurrence: { type: 'date', notNull: true },
    is_active: { type: 'boolean', notNull: true, default: true },
    description: { type: 'text' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('recurring_templates');
};