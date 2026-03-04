import { Injectable } from '@angular/core';
import { MongoClient, Db } from 'mongodb';

@Injectable({
  providedIn: 'root',
})
export class MongoDBService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected = false;

  private getConnectionString(): string {
    const user = process.env['mongodb_user'] || 'escolares_test';
    const pass = process.env['mongodb_pass'] || 'u0k8aKhXvjG0IzLD';
    const cluster = process.env['mongodb_cluster'] || 'escolares';
    return `mongodb+srv://${user}:${pass}@${cluster}.p5nmwji.mongodb.net/?appName=${cluster}`;
  }

  async connect(): Promise<boolean> {
    if (this.isConnected && this.db) {
      return true;
    }

    try {
      const uri = this.getConnectionString();
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.db = this.client.db('escolares');
      this.isConnected = true;
      console.log('Conectado a MongoDB exitosamente');
      return true;
    } catch (error) {
      console.error('Error conectando a MongoDB:', error);
      return false;
    }
  }

  async getDb(): Promise<Db | null> {
    if (!this.isConnected) {
      await this.connect();
    }
    return this.db;
  }

  async getCollection<T extends Document>(name: string) {
    const db = await this.getDb();
    if (!db) {
      throw new Error('Base de datos no disponible');
    }
    return db.collection<T>(name);
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.isConnected = false;
    }
  }

  get isDbConnected(): boolean {
    return this.isConnected;
  }
}
