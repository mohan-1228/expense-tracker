exports.up = (pgm) => {
  pgm.createTable('group_members', {
    group_id: { type: 'integer', notNull: true, references: 'groups', onDelete: 'CASCADE' },
    user_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'CASCADE' },
    joined_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  }, {
    constraints: {
      primaryKey: ['group_id', 'user_id'],
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('group_members');
};