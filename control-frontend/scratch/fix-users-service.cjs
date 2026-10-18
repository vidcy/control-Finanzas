const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('../control-backend/src/users/users.service.ts');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Fix async update(id: string, data: any)
// It was corrupted by line replacement
const brokenUpdateRegex = /async update\(id: string, data: any\) \{[\s\S]*?return updatedUser;\s*\}/;
const cleanUpdate = `async update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data: data,
    });
  }`;

if (brokenUpdateRegex.test(content)) {
  content = content.replace(brokenUpdateRegex, cleanUpdate);
  console.log('Fixed broken update() method!');
} else {
  console.log('brokenUpdateRegex did not match, checking lines...');
}

// 2. In me(id: string), ensure businessSlug and catalogConfig are in select
const meSelectTarget = `        trialEndsAt: true,\n      },`;
const meSelectReplacement = `        trialEndsAt: true,
        businessSlug: true,
        catalogConfig: true,
      },`;

if (content.includes(meSelectTarget) && !content.includes('businessSlug: true,\n        catalogConfig: true,\n      },')) {
  content = content.replace(meSelectTarget, meSelectReplacement);
  console.log('Added businessSlug and catalogConfig to me() select!');
}

// 3. Fix updateMyProfile
// Let's replace the whole updateMyProfile method cleanly
const updateMyProfileRegex = /async updateMyProfile\(id: string, data: any\) \{[\s\S]*?\n  async updateProfiles/;

const newUpdateMyProfile = `async updateMyProfile(id: string, data: any) {
    const allowedFields = [
      'name',
      'lastName',
      'personalAvatar',
      'businessName',
      'businessRuc',
      'businessReason',
      'businessRubro',
      'businessLogo',
      'businessBanner',
      'advisorLabel',
      'agentRoleSingular',
      'agentRolePlural',
      'defaultCommissionModel',
      'nubefactUrl',
      'nubefactToken',
      'catalogConfig',
    ];
    const updateData: any = {};
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    }

    // Clean and validate businessSlug
    if (data.businessSlug !== undefined) {
      const cleanSlug = data.businessSlug
        ? String(data.businessSlug)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9_-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
        : null;

      if (cleanSlug) {
        const existing = await this.prisma.user.findFirst({
          where: {
            businessSlug: cleanSlug,
            NOT: { id },
          },
        });
        if (existing) {
          throw new BadRequestException(
            'El enlace público / slug ya está en uso por otra tienda.',
          );
        }
      }
      updateData.businessSlug = cleanSlug;
    }

    // Validar RUC si se envía (11 dígitos numéricos en Perú)
    if (
      updateData.businessRuc !== undefined &&
      updateData.businessRuc !== null
    ) {
      const rucStr = String(updateData.businessRuc).trim();
      if (rucStr !== '') {
        if (!/^\d{11}$/.test(rucStr)) {
          throw new BadRequestException(
            'El RUC debe tener exactamente 11 dígitos numéricos.',
          );
        }
      }
    }

    // Obtener los datos actuales del usuario antes de actualizar para limpiar de DigitalOcean Spaces si cambia/elimina imágenes
    const currentUser = await this.prisma.user.findUnique({
      where: { id },
      select: {
        personalAvatar: true,
        businessLogo: true,
        businessBanner: true,
      },
    });

    if (currentUser) {
      // 1. Foto de perfil personal (personalAvatar)
      if (
        updateData.personalAvatar !== undefined &&
        currentUser.personalAvatar &&
        updateData.personalAvatar !== currentUser.personalAvatar
      ) {
        this.filesService
          .deleteFile(currentUser.personalAvatar)
          .catch((err) =>
            console.error('Error deleting old personalAvatar:', err),
          );
      }
      // 2. Logo del negocio (businessLogo)
      if (
        updateData.businessLogo !== undefined &&
        currentUser.businessLogo &&
        updateData.businessLogo !== currentUser.businessLogo
      ) {
        this.filesService
          .deleteFile(currentUser.businessLogo)
          .catch((err) =>
            console.error('Error deleting old businessLogo:', err),
          );
      }
      // 3. Banner del negocio (businessBanner)
      if (
        updateData.businessBanner !== undefined &&
        currentUser.businessBanner &&
        updateData.businessBanner !== currentUser.businessBanner
      ) {
        this.filesService
          .deleteFile(currentUser.businessBanner)
          .catch((err) =>
            console.error('Error deleting old businessBanner:', err),
          );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        profiles: true,
        blockedProfiles: true,
        personalAvatar: true,
        businessName: true,
        businessRuc: true,
        businessReason: true,
        businessRubro: true,
        businessLogo: true,
        businessBanner: true,
        businessSlug: true,
        catalogConfig: true,
        advisorLabel: true,
        agentRoleSingular: true,
        agentRolePlural: true,
        defaultCommissionModel: true,
        hasElectronicBilling: true,
        nubefactUrl: true,
        nubefactToken: true,
      },
    });
  }

  async updateProfiles`;

if (updateMyProfileRegex.test(content)) {
  content = content.replace(updateMyProfileRegex, newUpdateMyProfile);
  console.log('Fixed updateMyProfile() method cleanly!');
} else {
  console.log('updateMyProfileRegex did not match');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Finished updating users.service.ts');
