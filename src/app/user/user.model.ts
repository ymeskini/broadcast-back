import { Collection, Db, Filter, ObjectId, WithId, WithoutId } from 'mongodb';
import z from 'zod';

import { AppError } from '../../lib/AppError.js';
import { emailString } from '../../lib/commonSchemas.js';

const schema = z.object({
  email: emailString,
});

type UserSchema = z.infer<typeof schema>;
type UserWithId = WithId<UserSchema>;
type UserWithoutId = WithoutId<UserSchema>;

export class UserModel {
  private collection: Collection<UserSchema>;

  constructor(db: Db) {
    this.collection = db.collection<UserSchema>('users');
  }

  async init() {
    await this.collection.createIndex({ email: 1 });
  }

  findById(id: string) {
    const user = this.collection.findOne({
      _id: new ObjectId(id),
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async find(filter: Filter<UserSchema>) {
    const document = await this.collection.findOne(filter);

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    return document;
  }

  create(user: UserWithId | UserWithoutId) {
    return this.collection.insertOne(user);
  }

  update(filter: Filter<UserSchema>, update: Partial<UserSchema>) {
    return this.collection.updateOne(filter, { $set: update });
  }
}
