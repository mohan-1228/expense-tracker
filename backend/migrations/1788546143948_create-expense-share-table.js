exports.up = (pgm) => {
  pgm.createTable('expense_shares', {
    id: 'id', // shorthand for SERIAL PRIMARY KEY
    expense_id: { type: 'integer', notNull: true, references: 'expenses', onDelete: 'CASCADE' },
    user_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'CASCADE' },
    share_amount: { type: 'numeric(10, 2)', notNull: true },
    description: { type: 'text' },       
    is_settled: { type: 'boolean', notNull: true, default: false },  
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};  


exports.down = (pgm) => {
  pgm.dropTable('expense_shares');
};
