const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('../control-backend/src/users/users.service.ts');
let raw = fs.readFileSync(targetPath, 'utf8');
const isCRLF = raw.includes('\r\n');
const lines = raw.split(/\r?\n/);

// Find index of allowedFields
const allowedIdx = lines.findIndex(l => l.includes('const allowedFields = ['));
if (allowedIdx !== -1) {
  // find end of allowedFields array
  const allowedEndIdx = lines.findIndex((l, i) => i >= allowedIdx && l.includes('];'));
  const newLinesAllowed = [
    '    // Native update for businessSlug and catalogConfig to prevent Prisma client version mismatches',
    '    const businessSlug = data.businessSlug;',
    '    const catalogConfig = data.catalogConfig;',
    '',
    '    if (businessSlug !== undefined || catalogConfig !== undefined) {',
    '      try {',
    '        const setClauses: string[] = [];',
    '        const params: any[] = [];',
    '        if (businessSlug !== undefined) {',
    '          const cleanSlug = businessSlug',
    '            ? String(businessSlug)',
    '                .toLowerCase()',
    '                .trim()',
    '                .replace(/[^a-z0-9_-]/g, \'-\')',
    '                .replace(/-+/g, \'-\')',
    '                .replace(/^-|-$/g, \'\')',
    '            : null;',
    '          params.push(cleanSlug);',
    '          setClauses.push(`"businessSlug" = $${params.length}`);',
    '        }',
    '        if (catalogConfig !== undefined) {',
    '          const configJson =',
    '            typeof catalogConfig === \'string\'',
    '              ? catalogConfig',
    '              : JSON.stringify(catalogConfig);',
    '          params.push(configJson);',
    '          setClauses.push(`"catalogConfig" = $${params.length}::jsonb`);',
    '        }',
    '        params.push(id);',
    '        const query = `UPDATE "User" SET ${setClauses.join(\', \')} WHERE "id" = $${params.length}`;',
    '        await this.prisma.$executeRawUnsafe(query, ...params);',
    '      } catch (err: any) {',
    '        console.error(\'Error updating businessSlug/catalogConfig:\', err?.message);',
    '      }',
    '    }',
    '',
    '    const allowedFields = [',
    '      \'name\',',
    '      \'lastName\',',
    '      \'personalAvatar\',',
    '      \'businessName\',',
    '      \'businessRuc\',',
    '      \'businessReason\',',
    '      \'businessRubro\',',
    '      \'businessLogo\',',
    '      \'businessBanner\',',
    '      \'advisorLabel\',',
    '      \'agentRoleSingular\',',
    '      \'agentRolePlural\',',
    '      \'defaultCommissionModel\',',
    '      \'nubefactUrl\',',
    '      \'nubefactToken\',',
    '    ];'
  ];

  lines.splice(allowedIdx, (allowedEndIdx - allowedIdx + 1), ...newLinesAllowed);
  console.log('Replaced allowedFields successfully');
}

// Find return this.prisma.user.update
const returnIdx = lines.findIndex(l => l.includes('return this.prisma.user.update({'));
if (returnIdx !== -1) {
  // find end of return statement (the closing }); before the end of method)
  const returnEndIdx = lines.findIndex((l, i) => i >= returnIdx && l.includes('    });'));
  const newLinesReturn = [
    '    const updatedUser: any = await this.prisma.user.update({',
    '      where: { id },',
    '      data: updateData,',
    '      select: {',
    '        id: true,',
    '        name: true,',
    '        lastName: true,',
    '        email: true,',
    '        role: true,',
    '        isActive: true,',
    '        profiles: true,',
    '        blockedProfiles: true,',
    '        personalAvatar: true,',
    '        businessName: true,',
    '        businessRuc: true,',
    '        businessReason: true,',
    '        businessRubro: true,',
    '        businessLogo: true,',
    '        businessBanner: true,',
    '        advisorLabel: true,',
    '        agentRoleSingular: true,',
    '        agentRolePlural: true,',
    '        defaultCommissionModel: true,',
    '        hasElectronicBilling: true,',
    '        nubefactUrl: true,',
    '        nubefactToken: true,',
    '      },',
    '    });',
    '',
    '    try {',
    '      const extra: any = await this.prisma.$queryRawUnsafe(',
    '        \'SELECT "businessSlug", "catalogConfig" FROM "User" WHERE "id" = $1\',',
    '        id,',
    '      );',
    '      if (extra && extra.length > 0) {',
    '        updatedUser.businessSlug = extra[0].businessSlug;',
    '        updatedUser.catalogConfig = extra[0].catalogConfig;',
    '      }',
    '    } catch (e: any) {',
    '      // Ignored',
    '    }',
    '',
    '    return updatedUser;'
  ];

  lines.splice(returnIdx, (returnEndIdx - returnIdx + 1), ...newLinesReturn);
  console.log('Replaced return statement successfully');
}

const newlineChar = isCRLF ? '\r\n' : '\n';
fs.writeFileSync(targetPath, lines.join(newlineChar), 'utf8');
console.log('users.service.ts written cleanly!');
