import { buildChatSnapshot } from './admin-redes-sociales';

describe('buildChatSnapshot', () => {
  it('should update the selected chat with incoming messages and unread counts', () => {
    const currentChat = {
      usuario: '1234567890',
      plataforma: 'Instagram',
      mensajes: [],
      ultimoMensaje: {
        id: 'old',
        plataforma: 'Instagram',
        usuario: '1234567890',
        texto: 'Hola',
        fecha: new Date('2024-01-01T10:00:00.000Z'),
        leido: true,
        respondido: false,
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        updatedAt: new Date('2024-01-01T10:00:00.000Z')
      } as any,
      tieneNoLeidos: false,
      noLeidosCount: 0
    };

    const mensajes = [
      {
        id: 'new-1',
        plataforma: 'Instagram',
        usuario: '1234567890',
        texto: 'Mensaje nuevo',
        fecha: new Date('2024-01-01T11:00:00.000Z'),
        leido: false,
        respondido: false,
        createdAt: new Date('2024-01-01T11:00:00.000Z'),
        updatedAt: new Date('2024-01-01T11:00:00.000Z')
      },
      {
        id: 'old',
        plataforma: 'Instagram',
        usuario: '1234567890',
        texto: 'Hola',
        fecha: new Date('2024-01-01T10:00:00.000Z'),
        leido: true,
        respondido: false,
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        updatedAt: new Date('2024-01-01T10:00:00.000Z')
      }
    ] as any[];

    const updatedChat = buildChatSnapshot(currentChat as any, mensajes as any[]);

    expect(updatedChat.mensajes.length).toBe(2);
    expect(updatedChat.tieneNoLeidos).toBeTrue();
    expect(updatedChat.noLeidosCount).toBe(1);
    expect(updatedChat.ultimoMensaje.id).toBe('new-1');
  });
});
