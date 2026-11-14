exports.up = (pgm) => {
  pgm.addColumn('users', {
    email_verified_at: { type: 'timestamp' },
  });

  // Accounts created before this column existed were never asked to
  // verify - grandfather them in as verified so existing users (including
  // the admin's own account) aren't locked out of login by this migration.
  pgm.sql('UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL');

  pgm.createTable('email_verification_tokens', {
    id: 'id',
    user_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'CASCADE' },
    // Same hashing approach as password_reset_tokens: only the hash is
    // stored, so a DB leak can't be used to verify an account you don't own.
    token_hash: { type: 'varchar(64)', notNull: true, unique: true },
    expires_at: { type: 'timestamp', notNull: true },
    used_at: { type: 'timestamp' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('email_verification_tokens');
  pgm.dropColumn('users', 'email_verified_at');
};
