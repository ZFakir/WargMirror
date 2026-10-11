'use strict';

/**
 * Existing environments are grandfathered from database/schema.sql.
 * This marker intentionally performs no DDL or DML, so existing rows and
 * application tables remain untouched while Umzug starts recording changes.
 */
module.exports = {
  async up() {},
  async down() {}
};
