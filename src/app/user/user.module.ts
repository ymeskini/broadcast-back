import { Db } from 'mongodb';
import { UserModel } from './user.model.js';

export const initUserModule = async (db: Db) => {
  const userModel = new UserModel(db);

  await userModel.init();

  return {
    userModel,
  };
};
