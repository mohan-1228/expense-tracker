exports.up = (pgm) => {
  pgm.createTable('expenses', {
    id: 'id',
    paid_by: { type: 'integer', notNull: true, references: 'users', onDelete: 'CASCADE' },
    category_id: { type: 'integer', references: 'categories', onDelete: 'SET NULL' },
    amount: { type: 'numeric(10,2)', notNull: true },
    description: { type: 'varchar(255)' },
    expense_date: { type: 'date', notNull: true },
    group_id: { type: 'integer', references: 'groups', onDelete: 'SET NULL' },
    recurring_template_id: { type: 'integer', references: 'recurring_templates', onDelete: 'SET NULL' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('expenses');
};