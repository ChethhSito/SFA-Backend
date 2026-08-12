import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';

@Injectable()
export class AuthService implements OnModuleInit {
  private firebaseApp: App;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey || privateKey.includes('...')) {
      console.warn('⚠️ [Firebase Auth] La configuración de Firebase está incompleta o tiene valores ficticios de prueba. Las funciones de autenticación fallarán hasta que configures credenciales reales en intranet-back/.env.');
      return;
    }

    try {
      // Replace literal '\n' with actual newlines in private key
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

      this.firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      });
      console.log('✅ [Firebase Auth] Inicializado correctamente con el proyecto:', projectId);
    } catch (error: any) {
      console.error('❌ [Firebase Auth] Error al inicializar Firebase Admin:', error.message);
      console.warn('El servidor backend continuará ejecutándose, pero la validación de tokens de Firebase Auth fallará.');
    }
  }

  async verifyIdToken(token: string): Promise<DecodedIdToken> {
    if (!this.firebaseApp) {
      throw new Error('Firebase Auth Service is not initialized.');
    }
    return getAuth().verifyIdToken(token);
  }
}
