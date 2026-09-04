exports.up = (pgm) => {
  pgm.createTable('categories', {
    id: 'id', // shorthand for SERIAL PRIMARY KEY   
    name: { type: 'varchar(100)', notNull: true },
    user_id: { type: 'integer', references: 'users', onDelete: 'SET NULL' },
    is_default: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('categories');
};
