exports.up = (pgm) => {
  pgm.createTable('groups', {
    id: 'id', // shorthand for SERIAL PRIMARY KEY
    name: { type: 'varchar(100)', notNull: true },
    description: { type: 'text' },
    created_by: { type: 'integer', notNull: true, references: 'users', onDelete: 'CASCADE' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('groups');
};  

