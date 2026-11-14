exports.up = (pgm) => {
  pgm.createTable('password_reset_tokens', {
    id: 'id',
    user_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'CASCADE' },
    // SHA-256 hash of the raw token - the raw token only ever exists in
    // the emailed link, never stored, so a DB leak can't be used to reset
    // anyone's password.
    token_hash: { type: 'varchar(64)', notNull: true, unique: true },
    expires_at: { type: 'timestamp', notNull: true },
    used_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('password_reset_tokens');
};
