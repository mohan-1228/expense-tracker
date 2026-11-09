exports.up = (pgm) => {
  pgm.createTable('weekly_summaries', {
    id: 'id',
    user_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'CASCADE' },
    week_start: { type: 'date', notNull: true },
    summary_text: { type: 'text', notNull: true },
    facts_json: { type: 'jsonb', notNull: true },
    generated_by_ai: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  }, {
    constraints: {
      unique: ['user_id', 'week_start'],
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('weekly_summaries');
};
