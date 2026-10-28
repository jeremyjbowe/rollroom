import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
export const products = sqliteTable('products', {id:text('id').primaryKey(), name:text('name').notNull(), sku:text('sku').notNull(), thicknessMil:real('thickness_mil').notNull(), coreIn:real('core_in').notNull(), notes:text('notes').notNull(), measuredAt:text('measured_at').notNull(), active:integer('active',{mode:'boolean'}).notNull().default(true), updatedAt:text('updated_at').notNull()});
export const settings = sqliteTable('settings',{id:text('id').primaryKey(), adminId:text('admin_id').notNull()});
