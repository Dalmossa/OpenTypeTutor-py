import { describe, it, expect, beforeEach } from 'vitest';
import { GetUser } from './GetUser.js';
import { UpdateUserLayout } from './UpdateUserLayout.js';
import { InMemoryUserRepository } from '../../infrastructure/repositories/InMemoryUserRepository.js';
import { InMemoryUserProfileRepository } from '../../infrastructure/repositories/InMemoryUserProfileRepository.js';
import { User } from '../../domain/entities/User.js';
import { UserProfile } from '../../domain/entities/UserProfile.js';
import { Email } from '../../domain/value-objects/Email.js';
import { SessionId } from '../../domain/value-objects/SessionId.js';
import { Layout } from '../../domain/value-objects/Layout.js';
import {
  ProfileNotOwnedError,
  UserNotFoundError,
} from '../../domain/errors/DomainError.js';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440001';

describe('GetUser', () => {
  let userRepository: InMemoryUserRepository;
  let profileRepository: InMemoryUserProfileRepository;
  let getUser: GetUser;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    profileRepository = new InMemoryUserProfileRepository();
    getUser = new GetUser(userRepository, profileRepository);
  });

  describe('US-003 - Obter usuário autenticado', () => {
    beforeEach(async () => {
      await userRepository.save(
        User.create({
          id: SessionId.create(USER_ID),
          name: 'João Silva',
          email: Email.create('joao@example.com'),
          passwordHash: '$2b$12$abcdefghijklmnopqrstuv',
        })
      );
    });

    it('deve retornar dados do usuário sem expor passwordHash', async () => {
      const result = await getUser.execute(USER_ID, USER_ID);

      expect(result.id).toBe(USER_ID);
      expect(result.name).toBe('João Silva');
      expect(result.email).toBe('joao@example.com');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('deve retornar layout e nível padrão quando usuário não tem perfil', async () => {
      const result = await getUser.execute(USER_ID, USER_ID);

      expect(result.activeLayout).toBe('ABNT2');
      expect(result.currentLevel).toBe(1);
    });

    it('deve retornar layout e nível persistidos do perfil', async () => {
      await profileRepository.save(
        UserProfile.create({
          userId: SessionId.create(USER_ID),
          activeLayout: Layout.create('US-INTERNATIONAL'),
          currentLevel: 3,
        })
      );

      const result = await getUser.execute(USER_ID, USER_ID);

      expect(result.activeLayout).toBe('US-INTERNATIONAL');
      expect(result.currentLevel).toBe(3);
    });
  });

  describe('RN17 - Posse de perfil', () => {
    it('deve rejeitar acesso ao perfil de outro usuário', async () => {
      await userRepository.save(
        User.create({
          id: SessionId.create(USER_ID),
          name: 'João Silva',
          email: Email.create('joao@example.com'),
          passwordHash: '$2b$12$abcdefghijklmnopqrstuv',
        })
      );

      await expect(getUser.execute(USER_ID, OTHER_USER_ID)).rejects.toThrow(
        ProfileNotOwnedError
      );
    });
  });

  describe('PRD §13 - Usuário inexistente', () => {
    it('deve lançar USER_NOT_FOUND', async () => {
      await expect(getUser.execute(OTHER_USER_ID, OTHER_USER_ID)).rejects.toThrow(
        UserNotFoundError
      );
    });
  });
});

describe('UpdateUserLayout', () => {
  let profileRepository: InMemoryUserProfileRepository;
  let updateUserLayout: UpdateUserLayout;

  beforeEach(() => {
    profileRepository = new InMemoryUserProfileRepository();
    updateUserLayout = new UpdateUserLayout(profileRepository);
  });

  describe('PRD §7 - Alteração de layout ativo', () => {
    it('deve criar perfil e definir layout quando não existe', async () => {
      const result = await updateUserLayout.execute(USER_ID, {
        userId: USER_ID,
        layout: 'US-INTERNATIONAL',
      });

      expect(result.activeLayout).toBe('US-INTERNATIONAL');
      expect(result.currentLevel).toBe(1);

      const saved = await profileRepository.findByUserId(SessionId.create(USER_ID));
      expect(saved?.activeLayout.value).toBe('US-INTERNATIONAL');
    });

    it('deve atualizar layout de perfil existente preservando o nível', async () => {
      await profileRepository.save(
        UserProfile.create({
          userId: SessionId.create(USER_ID),
          activeLayout: Layout.create('US-INTERNATIONAL'),
          currentLevel: 2,
        })
      );

      const result = await updateUserLayout.execute(USER_ID, {
        userId: USER_ID,
        layout: 'ABNT2',
      });

      expect(result.activeLayout).toBe('ABNT2');
      expect(result.currentLevel).toBe(2);
    });

    it('deve rejeitar layout inválido', async () => {
      await expect(
        updateUserLayout.execute(USER_ID, {
          userId: USER_ID,
          layout: 'Dvorak',
        })
      ).rejects.toThrow('Layout inválido');
    });
  });

  describe('RN17 - Posse de perfil', () => {
    it('deve rejeitar alteração de perfil de outro usuário', async () => {
      await expect(
        updateUserLayout.execute(USER_ID, {
          userId: OTHER_USER_ID,
          layout: 'ABNT2',
        })
      ).rejects.toThrow(ProfileNotOwnedError);
    });
  });
});