#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { constants as fsConstants, promises as fs } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalSha256, fileSha256 } from '../../../04_AI_Work_Environment/Source_Resolution/scripts/source-resolution.mjs';
import { finalReviewIdentity, normalizePublicationConditions } from './final-review-package-compiler.mjs';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = path.resolve(MODULE_DIR, '../schemas');
const EXPECTED_FILES = ['approval-evidence.json','body.md','final-review-package.json','header.png','human-event.json','manifest.json','publication-conditions.json','source-manifest.json'];
const ZIP_ROOT = 'PublicationBundle/';
const MAX_ZIP_ENTRY_BYTES = 100 * 1024 * 1024;
const MAX_ZIP_TOTAL_BYTES = 250 * 1024 * 1024;

function fail(code, detail = '') { throw new Error(`${code}${detail ? `: ${detail}` : ''}`); }
function requireValue(value, code, detail = '') { if (!value) fail(code, detail); }
async function readJson(file, code) { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (error) { fail(code, error.message); } }
function sameDestination(left, right) { return left?.service === right?.service && left?.account_id === right?.account_id && left?.publication_target === right?.publication_target; }
function safeArticle(value) { const safe = String(value).replace(/[^A-Za-z0-9._-]/g, '-').replace(/^-+|-+$/g, ''); requireValue(safe, 'BUNDLE_ARTICLE_ID_NOT_FILESYSTEM_SAFE'); return safe; }
function sha256(value) { return createHash('sha256').update(value).digest('hex'); }

function resolvePointer(root, pointer) {
  requireValue(typeof pointer === 'string' && pointer.startsWith('#/'), 'SCHEMA_REF_UNSUPPORTED', String(pointer));
  return pointer.slice(2).split('/').reduce((value, segment) => value?.[segment.replaceAll('~1', '/').replaceAll('~0', '~')], root);
}

function schemaErrors(value, schema, root, location = '$') {
  const errors = [];
  if (!schema) return [`${location}: schema missing`];
  if (schema.$ref) return schemaErrors(value, resolvePointer(root, schema.$ref), root, location);
  if (schema.allOf) for (const item of schema.allOf) errors.push(...schemaErrors(value, item, root, location));
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((item) => schemaErrors(value, item, root, location).length === 0).length;
    if (matches !== 1) errors.push(`${location}: oneOf matched ${matches}`);
  }
  if (schema.if && schemaErrors(value, schema.if, root, location).length === 0 && schema.then) errors.push(...schemaErrors(value, schema.then, root, location));
  if (schema.const !== undefined && JSON.stringify(value) !== JSON.stringify(schema.const)) errors.push(`${location}: const mismatch`);
  if (schema.enum && !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) errors.push(`${location}: enum mismatch`);
  const actualType = Array.isArray(value) ? 'array' : value === null ? 'null' : Number.isInteger(value) ? 'integer' : typeof value;
  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    const matches = allowed.includes(actualType) || (actualType === 'integer' && allowed.includes('number'));
    if (!matches) { errors.push(`${location}: expected ${allowed.join('|')}, got ${actualType}`); return errors; }
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${location}: minLength`);
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) errors.push(`${location}: pattern`);
    if (schema.format === 'date-time' && (Number.isNaN(Date.parse(value)) || !/[tT]/.test(value))) errors.push(`${location}: date-time`);
  }
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) errors.push(`${location}: minimum`);
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${location}: minItems`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${location}: uniqueItems`);
    if (schema.items) value.forEach((item, index) => errors.push(...schemaErrors(item, schema.items, root, `${location}[${index}]`)));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) errors.push(`${location}: missing ${key}`);
    for (const [key, item] of Object.entries(schema.properties || {})) if (Object.hasOwn(value, key)) errors.push(...schemaErrors(value[key], item, root, `${location}.${key}`));
    if (schema.additionalProperties === false) for (const key of Object.keys(value)) if (!Object.hasOwn(schema.properties || {}, key)) errors.push(`${location}: unexpected ${key}`);
  }
  return errors;
}

export async function validateJsonSchema(value, schemaName, label = schemaName) {
  const schema = await readJson(path.join(SCHEMA_DIR, schemaName), 'SCHEMA_NOT_FOUND');
  const errors = schemaErrors(value, schema, schema);
  requireValue(errors.length === 0, `${label}_SCHEMA_FAIL`, errors.slice(0, 8).join('; '));
  return { result: 'PASS', schema: schemaName };
}

export function explicitPublicationIntent(statement, stage) {
  if (stage !== 'FINAL_REVIEW_PACKAGE_PRESENTED') return false;
  const normalized = String(statement).trim().replace(/[\s　]+/g, ' ').replace(/[。.!！…]+$/g, '');
  return /^(?:ok(?: ?(?:投稿して|公開して))?|これでいい|投稿して|公開して|いけー|これでお願いします|この内容でお願いします|このまま進めて|進めて)$/i.test(normalized);
}

export function publicationConditionsIdentity(conditions) {
  const normalized = normalizePublicationConditions(conditions);
  const canonical_json = JSON.stringify(normalized);
  return { identity_sha256: sha256(Buffer.from(canonical_json, 'utf8')), canonical_json, normalized };
}

export function publicationBundleIdentity(manifest) {
  const payload = {
    article_id: manifest.article_id,
    package: { package_id: manifest.package.package_id, identity_sha256: manifest.package.identity_sha256.toLowerCase(), sha256: manifest.package.sha256.toLowerCase() },
    body_sha256: manifest.body.sha256.toLowerCase(),
    header_sha256: manifest.header.sha256.toLowerCase(),
    publication_conditions: { identity_sha256: manifest.publication_conditions.identity_sha256.toLowerCase(), sha256: manifest.publication_conditions.sha256.toLowerCase() },
    source_manifest: { manifest_id: manifest.source_manifest.manifest_id, sha256: manifest.source_manifest.sha256.toLowerCase() },
    approval: { approval_id: manifest.approval_evidence.approval_id, sha256: manifest.approval_evidence.sha256.toLowerCase(), human_event_id: manifest.human_event.event_id, human_event_sha256: manifest.human_event.sha256.toLowerCase() },
    destination: { service: manifest.destination.service, account_id: manifest.destination.account_id, publication_target: manifest.destination.publication_target },
    purpose: manifest.purpose
  };
  const identity_sha256 = canonicalSha256(payload);
  const safe_article_id = safeArticle(manifest.article_id);
  return { bundle_id: `PB-${safe_article_id}-${identity_sha256}`, identity_sha256, canonical_identity_json: JSON.stringify(payload), safe_article_id };
}

export function validateBundleIdentity(manifest) {
  const expected = publicationBundleIdentity(manifest);
  requireValue(manifest.bundle_id === expected.bundle_id, 'BUNDLE_IDENTITY_MISMATCH');
  requireValue(manifest.identity_sha256 === expected.identity_sha256, 'BUNDLE_IDENTITY_SHA_MISMATCH');
  return { result: 'PASS', bundle_id: expected.bundle_id, identity_sha256: expected.identity_sha256 };
}

export async function validateApprovedPackageBinding({ packagePath, humanEventPath, approvalPath, actualPackagePath, sourceManifestPath, d3BodyPath, headerPath }) {
  const [packageValue, actual, event, approval] = await Promise.all([
    readJson(packagePath, 'PACKAGE_INVALID'), readJson(actualPackagePath, 'ACTUAL_PACKAGE_INVALID'), readJson(humanEventPath, 'HUMAN_EVENT_INVALID'), readJson(approvalPath, 'APPROVAL_INVALID')
  ]);
  await Promise.all([
    validateJsonSchema(packageValue, 'final_review_package.schema.json', 'PACKAGE'), validateJsonSchema(actual, 'final_review_package.schema.json', 'ACTUAL_PACKAGE'),
    validateJsonSchema(event, 'human_event.schema.json', 'HUMAN_EVENT'), validateJsonSchema(approval, 'publication_approval.schema.json', 'APPROVAL')
  ]);
  const failures = [];
  const packageIdentity = finalReviewIdentity(packageValue);
  const actualIdentity = finalReviewIdentity(actual);
  if (packageValue.package_id !== packageIdentity.package_id || packageValue.identity_sha256 !== packageIdentity.identity_sha256) failures.push('PACKAGE_IDENTITY_INVALID');
  if (actual.package_id !== actualIdentity.package_id || actual.identity_sha256 !== actualIdentity.identity_sha256) failures.push('ACTUAL_PACKAGE_IDENTITY_INVALID');
  const [packageSha, actualSha, eventSha, sourceSha, bodySha, headerSha] = await Promise.all([packagePath, actualPackagePath, humanEventPath, sourceManifestPath, d3BodyPath, headerPath].map(fileSha256));
  if (actualSha !== packageSha) failures.push('ACTUAL_PACKAGE_MISMATCH');
  if (approval.package_id !== packageValue.package_id || event.context.package_id !== packageValue.package_id) failures.push('PACKAGE_ID_MISMATCH');
  if (approval.package_identity_sha256 !== packageValue.identity_sha256 || event.context.package_identity_sha256 !== packageValue.identity_sha256) failures.push('PACKAGE_IDENTITY_MISMATCH');
  if (approval.package_sha256 !== packageSha || event.context.package_sha256 !== packageSha) failures.push('PACKAGE_SHA_MISMATCH');
  if (approval.human_event_id !== event.event_id || approval.human_event_sha256 !== eventSha) failures.push('HUMAN_EVENT_MISMATCH');
  if (!sameDestination(approval.destination, packageValue.destination) || !sameDestination(event.context.destination, packageValue.destination)) failures.push('DESTINATION_MISMATCH');
  if (packageValue.destination.service !== 'note' || approval.approval_scope !== 'NOTE_PUBLICATION' || approval.approval_type !== 'FINAL_AND_PUBLICATION' || approval.decision !== 'APPROVED') failures.push('APPROVAL_SCOPE_MISMATCH');
  if (approval.purpose !== packageValue.purpose || event.context.purpose !== packageValue.purpose || packageValue.purpose !== 'NOTE_PUBLICATION') failures.push('PURPOSE_MISMATCH');
  if (packageValue.source_manifest.sha256 !== sourceSha) failures.push('SOURCE_MANIFEST_MISMATCH');
  if (actual.d3_body.sha256 !== bodySha) failures.push('D3_BODY_MISMATCH');
  if (actual.header.sha256 !== headerSha) failures.push('HEADER_MISMATCH');
  if (actual.d3_body.content !== await fs.readFile(d3BodyPath, 'utf8')) failures.push('D3_BODY_CONTENT_MISMATCH');
  if (!explicitPublicationIntent(event.statement, event.context.stage)) failures.push('EXPLICIT_PUBLICATION_INTENT_MISSING');
  const presentedAt = Date.parse(event.context.presented_at);
  const eventAt = Date.parse(event.occurred_at);
  const approvalAt = Date.parse(approval.approved_at);
  if ([presentedAt,eventAt,approvalAt].some(Number.isNaN)) failures.push('APPROVAL_TIME_INVALID');
  else { if (eventAt < presentedAt) failures.push('HUMAN_EVENT_BEFORE_FINAL_PACKAGE'); if (approvalAt !== eventAt) failures.push('APPROVAL_TIME_NOT_BOUND_TO_EVENT'); }
  requireValue(failures.length === 0, 'NOTE_G5_FAIL', failures.join(', '));
  return { result: 'PASS', gate: 'APPROVED_PACKAGE_BINDING_VERIFICATION', package_id: packageValue.package_id, package_identity_sha256: packageValue.identity_sha256, package_sha256: packageSha, approval_id: approval.approval_id, approval_scope: approval.approval_scope, next_step: 'BUNDLE_BUILD', requires_additional_human_approval: false };
}

function bundlePaths(bundleDirectory) {
  return { manifest: path.join(bundleDirectory,'manifest.json'), body: path.join(bundleDirectory,'body.md'), header: path.join(bundleDirectory,'header.png'), publication_conditions: path.join(bundleDirectory,'publication-conditions.json'), approval: path.join(bundleDirectory,'approval-evidence.json'), human_event: path.join(bundleDirectory,'human-event.json'), source_manifest: path.join(bundleDirectory,'source-manifest.json'), package: path.join(bundleDirectory,'final-review-package.json') };
}

async function assertPlainFile(file, code) { const stat = await fs.lstat(file).catch(() => null); requireValue(stat?.isFile() && !stat.isSymbolicLink(), code); }

export async function verifyBundleDirectory({ bundleDirectory, expectedPackageId }) {
  try {
    const root = path.resolve(bundleDirectory);
    const rootStat = await fs.lstat(root).catch(() => null);
    requireValue(rootStat?.isDirectory() && !rootStat.isSymbolicLink(), 'PUBLICATION_BUNDLE_DIRECTORY_NOT_FOUND');
    const entries = await fs.readdir(root, { withFileTypes: true });
    requireValue(entries.every((entry) => entry.isFile()), 'BUNDLE_UNEXPECTED_DIRECTORY');
    const names = entries.map((entry) => entry.name).sort();
    for (const name of EXPECTED_FILES) requireValue(names.includes(name), 'BUNDLE_FILE_MISSING', name);
    requireValue(names.length === EXPECTED_FILES.length, 'BUNDLE_UNEXPECTED_FILE', names.filter((name) => !EXPECTED_FILES.includes(name)).join(', '));
    const paths = bundlePaths(root);
    await Promise.all(Object.values(paths).map((file) => assertPlainFile(file, 'BUNDLE_FILE_INVALID')));
    const [manifest, packageValue, conditions, approval, event] = await Promise.all([
      readJson(paths.manifest,'BUNDLE_MANIFEST_INVALID'), readJson(paths.package,'PACKAGE_INVALID'), readJson(paths.publication_conditions,'PUBLICATION_CONDITIONS_INVALID'), readJson(paths.approval,'APPROVAL_INVALID'), readJson(paths.human_event,'HUMAN_EVENT_INVALID')
    ]);
    await Promise.all([
      validateJsonSchema(manifest,'publication_bundle_manifest.schema.json','BUNDLE_MANIFEST'), validateJsonSchema(packageValue,'final_review_package.schema.json','PACKAGE'),
      validateJsonSchema(conditions,'publication_conditions.schema.json','PUBLICATION_CONDITIONS'), validateJsonSchema(approval,'publication_approval.schema.json','APPROVAL'), validateJsonSchema(event,'human_event.schema.json','HUMAN_EVENT')
    ]);
    validateBundleIdentity(manifest);
    const packageIdentity = finalReviewIdentity(packageValue);
    requireValue(packageValue.package_id === packageIdentity.package_id && packageValue.identity_sha256 === packageIdentity.identity_sha256, 'FINAL_REVIEW_PACKAGE_IDENTITY_MISMATCH');
    requireValue(manifest.package.package_id === expectedPackageId && packageValue.package_id === expectedPackageId, 'BUNDLE_PACKAGE_ID_MISMATCH');
    const bindings = [['BODY',paths.body,manifest.body.sha256],['HEADER',paths.header,manifest.header.sha256],['PUBLICATION_CONDITIONS',paths.publication_conditions,manifest.publication_conditions.sha256],['APPROVAL_EVIDENCE',paths.approval,manifest.approval_evidence.sha256],['HUMAN_EVENT',paths.human_event,manifest.human_event.sha256],['SOURCE_MANIFEST',paths.source_manifest,manifest.source_manifest.sha256],['FINAL_REVIEW_PACKAGE',paths.package,manifest.package.sha256]];
    for (const [name,file,expected] of bindings) requireValue(await fileSha256(file) === expected, `${name}_SHA_MISMATCH`);
    const conditionIdentity = publicationConditionsIdentity(conditions.conditions);
    requireValue(conditions.identity_sha256 === conditionIdentity.identity_sha256 && manifest.publication_conditions.identity_sha256 === conditionIdentity.identity_sha256, 'PUBLICATION_CONDITIONS_IDENTITY_MISMATCH');
    requireValue(publicationConditionsIdentity(packageValue.publication_conditions).canonical_json === conditionIdentity.canonical_json, 'PUBLICATION_CONDITIONS_PACKAGE_MISMATCH');
    requireValue(packageValue.d3_body.sha256 === manifest.body.sha256 && packageValue.d3_body.content === await fs.readFile(paths.body,'utf8'), 'BODY_PACKAGE_MISMATCH');
    requireValue(packageValue.header.sha256 === manifest.header.sha256, 'HEADER_PACKAGE_MISMATCH');
    requireValue(packageValue.source_manifest.manifest_id === manifest.source_manifest.manifest_id && packageValue.source_manifest.sha256 === manifest.source_manifest.sha256, 'SOURCE_MANIFEST_PACKAGE_MISMATCH');
    requireValue(packageValue.identity_sha256 === manifest.package.identity_sha256, 'FINAL_REVIEW_PACKAGE_IDENTITY_MISMATCH');
    await validateApprovedPackageBinding({ packagePath: paths.package, humanEventPath: paths.human_event, approvalPath: paths.approval, actualPackagePath: paths.package, sourceManifestPath: paths.source_manifest, d3BodyPath: paths.body, headerPath: paths.header });
    requireValue(manifest.destination.service === 'note' && manifest.purpose === 'publish' && sameDestination(manifest.destination, packageValue.destination), 'BUNDLE_DESTINATION_PURPOSE_MISMATCH');
    return { result: 'PASS', state: 'HANDOFF_VERIFIED', previous_state: 'HANDOFF_PENDING', next_gate: 'G5', bundle_id: manifest.bundle_id, bundle_identity_sha256: manifest.identity_sha256, package_id: packageValue.package_id, paths, transport: 'same-work-directory' };
  } catch (error) { if (error.message.startsWith('BUNDLE_HANDOFF_FAIL:')) throw error; fail('BUNDLE_HANDOFF_FAIL', error.message); }
}

const CRC_TABLE = (() => { const table = new Uint32Array(256); for (let n=0;n<256;n+=1){let c=n; for(let k=0;k<8;k+=1)c=(c&1)?0xedb88320^(c>>>1):c>>>1; table[n]=c>>>0;} return table; })();
function crc32(buffer) { let crc=0xffffffff; for(const byte of buffer) crc=CRC_TABLE[(crc^byte)&0xff]^(crc>>>8); return (crc^0xffffffff)>>>0; }
function zipName(name) { requireValue(!name.includes('\\') && !name.startsWith('/') && !/^[A-Za-z]:/.test(name), 'BUNDLE_ZIP_PATH_ESCAPE'); const parts=name.split('/').filter((_,i,a)=>i<a.length-1 || a[i]!==''); requireValue(parts.length && parts.every((part)=>part && part!=='.' && part!=='..'), 'BUNDLE_ZIP_PATH_ESCAPE'); return parts.join('/')+(name.endsWith('/')?'/':''); }

export async function createDeterministicZip(zipPath, entries) {
  const local = []; const central = []; let offset=0;
  for (const entry of entries) {
    const name=Buffer.from(zipName(entry.name),'utf8'); const data=entry.data; const crc=crc32(data); const header=Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50,0); header.writeUInt16LE(20,4); header.writeUInt16LE(0x0800,6); header.writeUInt16LE(0,8); header.writeUInt16LE(0,10); header.writeUInt16LE(0x21,12); header.writeUInt32LE(crc,14); header.writeUInt32LE(data.length,18); header.writeUInt32LE(data.length,22); header.writeUInt16LE(name.length,26);
    local.push(header,name,data); const ch=Buffer.alloc(46); ch.writeUInt32LE(0x02014b50,0); ch.writeUInt16LE(20,4); ch.writeUInt16LE(20,6); ch.writeUInt16LE(0x0800,8); ch.writeUInt16LE(0,10); ch.writeUInt16LE(0,12); ch.writeUInt16LE(0x21,14); ch.writeUInt32LE(crc,16); ch.writeUInt32LE(data.length,20); ch.writeUInt32LE(data.length,24); ch.writeUInt16LE(name.length,28); ch.writeUInt32LE(entry.name.endsWith('/')?0x10:0,38); ch.writeUInt32LE(offset,42); central.push(ch,name); offset+=header.length+name.length+data.length;
  }
  const centralBytes=Buffer.concat(central); const eocd=Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50,0); eocd.writeUInt16LE(entries.length,8); eocd.writeUInt16LE(entries.length,10); eocd.writeUInt32LE(centralBytes.length,12); eocd.writeUInt32LE(offset,16);
  await fs.writeFile(zipPath,Buffer.concat([...local,centralBytes,eocd]));
}

export function parseZip(buffer) {
  let eocd=-1; for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i-=1){if(buffer.readUInt32LE(i)===0x06054b50){eocd=i;break;}}
  requireValue(eocd>=0,'BUNDLE_ZIP_INVALID'); const count=buffer.readUInt16LE(eocd+10); const diskCount=buffer.readUInt16LE(eocd+8); const centralSize=buffer.readUInt32LE(eocd+12); const centralOffset=buffer.readUInt32LE(eocd+16); requireValue(buffer.readUInt16LE(eocd+4)===0&&buffer.readUInt16LE(eocd+6)===0&&diskCount===count,'BUNDLE_ZIP_MULTIDISK_UNSUPPORTED'); requireValue(centralOffset+centralSize===eocd,'BUNDLE_ZIP_CENTRAL_INVALID');
  const entries=[]; const seen=new Set(); let cursor=centralOffset; let totalSize=0;
  for(let index=0;index<count;index+=1){requireValue(cursor+46<=eocd&&buffer.readUInt32LE(cursor)===0x02014b50,'BUNDLE_ZIP_CENTRAL_INVALID'); const flags=buffer.readUInt16LE(cursor+8); const method=buffer.readUInt16LE(cursor+10); const crc=buffer.readUInt32LE(cursor+16); const compressed=buffer.readUInt32LE(cursor+20); const size=buffer.readUInt32LE(cursor+24); const nameLength=buffer.readUInt16LE(cursor+28); const extraLength=buffer.readUInt16LE(cursor+30); const commentLength=buffer.readUInt16LE(cursor+32); const external=buffer.readUInt32LE(cursor+38); const localOffset=buffer.readUInt32LE(cursor+42); const centralEnd=cursor+46+nameLength+extraLength+commentLength; requireValue(centralEnd<=eocd,'BUNDLE_ZIP_CENTRAL_INVALID'); const name=zipName(buffer.subarray(cursor+46,cursor+46+nameLength).toString('utf8')); requireValue(!(flags&1)&&[0,8].includes(method),'BUNDLE_ZIP_METHOD_UNSUPPORTED'); requireValue(size<=MAX_ZIP_ENTRY_BYTES&&(totalSize+=size)<=MAX_ZIP_TOTAL_BYTES,'BUNDLE_ZIP_SIZE_LIMIT'); requireValue(!seen.has(name.toLowerCase()),'BUNDLE_ZIP_DUPLICATE_ENTRY'); seen.add(name.toLowerCase()); const unixMode=external>>>16; requireValue((unixMode&0xf000)!==0xa000,'BUNDLE_ZIP_SYMLINK_FORBIDDEN'); requireValue(localOffset+30<=centralOffset&&buffer.readUInt32LE(localOffset)===0x04034b50,'BUNDLE_ZIP_LOCAL_INVALID'); const localFlags=buffer.readUInt16LE(localOffset+6); const localMethod=buffer.readUInt16LE(localOffset+8); const localNameLength=buffer.readUInt16LE(localOffset+26); const localExtraLength=buffer.readUInt16LE(localOffset+28); const localEnd=localOffset+30+localNameLength+localExtraLength; requireValue(localEnd<=centralOffset&&localFlags===flags&&localMethod===method,'BUNDLE_ZIP_LOCAL_INVALID'); const localName=buffer.subarray(localOffset+30,localOffset+30+localNameLength).toString('utf8'); requireValue(localName===name,'BUNDLE_ZIP_NAME_MISMATCH'); const start=localEnd; requireValue(start+compressed<=centralOffset,'BUNDLE_ZIP_CONTENT_INVALID'); const packed=buffer.subarray(start,start+compressed); const data=method===0?Buffer.from(packed):inflateRawSync(packed,{maxOutputLength:size}); requireValue(data.length===size&&crc32(data)===crc,'BUNDLE_ZIP_CONTENT_INVALID'); entries.push({name,data,directory:name.endsWith('/')}); cursor=centralEnd; }
  requireValue(cursor===eocd,'BUNDLE_ZIP_CENTRAL_INVALID');
  return entries;
}

export async function verifyBundleZip({ zipPath, expectedPackageId, extractionDirectory }) {
  try {
    requireValue(path.extname(zipPath)==='.zip','BUNDLE_ZIP_REQUIRED'); const entries=parseZip(await fs.readFile(zipPath)); const names=entries.map((entry)=>entry.name).sort(); const filesOnly=EXPECTED_FILES.map((name)=>ZIP_ROOT+name).sort(); const withRoot=[ZIP_ROOT,...filesOnly].sort(); requireValue(JSON.stringify(names)===JSON.stringify(filesOnly)||JSON.stringify(names)===JSON.stringify(withRoot),'BUNDLE_ZIP_TOP_LEVEL_INVALID');
    const root=path.resolve(extractionDirectory); const existing=await fs.readdir(root).catch((error)=>error.code==='ENOENT'?null:Promise.reject(error)); requireValue(existing===null||existing.length===0,'HANDOFF_EXTRACTION_DIRECTORY_NOT_EMPTY'); await fs.mkdir(root,{recursive:true});
    for(const entry of entries){const target=path.resolve(root,...entry.name.split('/').filter(Boolean)); requireValue(target===root||target.startsWith(root+path.sep),'BUNDLE_ZIP_PATH_ESCAPE'); if(entry.directory) await fs.mkdir(target,{recursive:true}); else {await fs.mkdir(path.dirname(target),{recursive:true}); await fs.writeFile(target,entry.data,{flag:'wx'});}}
    const result=await verifyBundleDirectory({bundleDirectory:path.join(root,'PublicationBundle'),expectedPackageId}); return {...result,transport:'single_zip',zip_path:path.resolve(zipPath)};
  } catch(error){if(error.message.startsWith('BUNDLE_HANDOFF_FAIL:'))throw error; fail('BUNDLE_HANDOFF_FAIL',error.message);}
}

export async function buildPublicationBundle({ packagePath, humanEventPath, approvalPath, sourceManifestPath, d3BodyPath, headerPath, outputDirectory }) {
  try {
    await validateApprovedPackageBinding({packagePath,humanEventPath,approvalPath,actualPackagePath:packagePath,sourceManifestPath,d3BodyPath,headerPath});
    const [packageValue,approval,event]=await Promise.all([readJson(packagePath,'PACKAGE_INVALID'),readJson(approvalPath,'APPROVAL_INVALID'),readJson(humanEventPath,'HUMAN_EVENT_INVALID')]);
    const conditionsIdentity=publicationConditionsIdentity(packageValue.publication_conditions); const conditionsDocument={schema_version:'note-publication-conditions/v1',identity_sha256:conditionsIdentity.identity_sha256,conditions:conditionsIdentity.normalized}; const conditionsText=JSON.stringify(conditionsDocument,null,2);
    const manifest={schema_version:'note-publication-bundle-manifest/v1',builder_version:'note-publication-bundle-builder/v1',bundle_id:'',identity_sha256:'',state:'BUNDLE_SEALED',handoff_state:'HANDOFF_PENDING',article_id:packageValue.article_id,package:{package_id:packageValue.package_id,identity_sha256:packageValue.identity_sha256,path:'final-review-package.json',sha256:await fileSha256(packagePath)},body:{path:'body.md',sha256:await fileSha256(d3BodyPath)},header:{path:'header.png',sha256:await fileSha256(headerPath)},publication_conditions:{path:'publication-conditions.json',sha256:sha256(Buffer.from(conditionsText,'utf8')),identity_sha256:conditionsIdentity.identity_sha256},approval_evidence:{path:'approval-evidence.json',approval_id:approval.approval_id,sha256:await fileSha256(approvalPath)},human_event:{path:'human-event.json',event_id:event.event_id,sha256:await fileSha256(humanEventPath)},source_manifest:{path:'source-manifest.json',manifest_id:packageValue.source_manifest.manifest_id,sha256:await fileSha256(sourceManifestPath)},destination:{service:'note',account_id:packageValue.destination.account_id,publication_target:packageValue.destination.publication_target},purpose:'publish'};
    Object.assign(manifest,publicationBundleIdentity(manifest)); delete manifest.canonical_identity_json; delete manifest.safe_article_id;
    const outputRoot=path.resolve(outputDirectory); const versionRoot=path.join(outputRoot,manifest.bundle_id); const bundleDirectory=path.join(versionRoot,'PublicationBundle'); const zipPath=path.join(versionRoot,`${safeArticle(manifest.article_id)}_PublicationBundle.zip`);
    if(await fs.stat(versionRoot).catch(()=>null)){await verifyBundleDirectory({bundleDirectory,expectedPackageId:packageValue.package_id}); await assertPlainFile(zipPath,'BUNDLE_IMMUTABLE_CONFLICT'); return {result:'PASS',previous_state:'HUMAN_APPROVED',state:'BUNDLE_SEALED',handoff_state:'HANDOFF_PENDING',bundle_id:manifest.bundle_id,bundle_identity_sha256:manifest.identity_sha256,package_id:packageValue.package_id,bundle_directory:bundleDirectory,zip_path:zipPath,transport:'single_zip'};}
    await fs.mkdir(outputRoot,{recursive:true}); const temporaryRoot=path.join(outputRoot,`.bundle-build-${process.pid}-${Date.now()}`); requireValue(temporaryRoot.startsWith(outputRoot+path.sep),'BUNDLE_TEMP_PATH_INVALID'); const temporaryBundle=path.join(temporaryRoot,'PublicationBundle'); await fs.mkdir(temporaryBundle,{recursive:true});
    try { const copies=[[d3BodyPath,'body.md'],[headerPath,'header.png'],[approvalPath,'approval-evidence.json'],[humanEventPath,'human-event.json'],[sourceManifestPath,'source-manifest.json'],[packagePath,'final-review-package.json']]; for(const [source,name] of copies)await fs.copyFile(source,path.join(temporaryBundle,name),fsConstants.COPYFILE_EXCL); await fs.writeFile(path.join(temporaryBundle,'publication-conditions.json'),conditionsText,{flag:'wx'}); await fs.writeFile(path.join(temporaryBundle,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'}); await verifyBundleDirectory({bundleDirectory:temporaryBundle,expectedPackageId:packageValue.package_id}); const zipEntries=[{name:ZIP_ROOT,data:Buffer.alloc(0)},...await Promise.all(EXPECTED_FILES.map(async(name)=>({name:ZIP_ROOT+name,data:await fs.readFile(path.join(temporaryBundle,name))})))]; await createDeterministicZip(path.join(temporaryRoot,`${safeArticle(manifest.article_id)}_PublicationBundle.zip`),zipEntries); await fs.rename(temporaryRoot,versionRoot); }
    catch(error){await fs.rm(temporaryRoot,{recursive:true,force:true});throw error;}
    return {result:'PASS',previous_state:'HUMAN_APPROVED',state:'BUNDLE_SEALED',handoff_state:'HANDOFF_PENDING',bundle_id:manifest.bundle_id,bundle_identity_sha256:manifest.identity_sha256,package_id:packageValue.package_id,bundle_directory:bundleDirectory,zip_path:zipPath,transport:'single_zip'};
  } catch(error){if(error.message.startsWith('BUNDLE_BUILD_FAIL:')||error.message.startsWith('BUNDLE_IMMUTABLE_CONFLICT'))throw error;fail('BUNDLE_BUILD_FAIL',error.message);}
}

export async function validateG5({bundleDirectory,expectedPackageId}) { const handoff=await verifyBundleDirectory({bundleDirectory,expectedPackageId}); return {result:'PASS',gate:'G5_AUTOMATED_PACKAGE_VERIFICATION',state:'G5_PASS',bundle_id:handoff.bundle_id,package_id:handoff.package_id,next_step:'NOTE_DRAFT_CREATE',requires_additional_human_approval:false}; }
export async function validatePublicationStep({step,bundleDirectory,expectedPackageId,additionalHumanApprovalRequested=false,newHumanDecisionRequired=false}) { requireValue(['NOTE_DRAFT_CREATE','BODY_APPLY','HEADER_APPLY','PUBLICATION_CONDITIONS_APPLY','SETTINGS_VERIFY','PUBLISH','PPV'].includes(step),'PUBLICATION_STEP_INVALID'); requireValue(!additionalHumanApprovalRequested,'REDUNDANT_PUBLICATION_APPROVAL_REQUEST',step); requireValue(!newHumanDecisionRequired,'APPROVAL_INVALIDATED_NEW_HUMAN_DECISION',step); const g5=await validateG5({bundleDirectory,expectedPackageId}); return {result:'PASS',step,package_id:g5.package_id,requires_additional_human_approval:false}; }
export async function publicationE2EPlan({bundleDirectory,expectedPackageId}) { const steps=['NOTE_DRAFT_CREATE','BODY_APPLY','HEADER_APPLY','PUBLICATION_CONDITIONS_APPLY','SETTINGS_VERIFY','PUBLISH','PPV']; const results=[]; for(const step of steps)results.push(await validatePublicationStep({step,bundleDirectory,expectedPackageId})); const handoff=await verifyBundleDirectory({bundleDirectory,expectedPackageId}); return {result:'PASS',states:['HANDOFF_VERIFIED','G5_PASS','NOTE_DRAFT_CREATE','BODY_APPLY','HEADER_APPLY','PUBLICATION_CONDITIONS_APPLY','SETTINGS_VERIFY','PUBLISHED','PPV_PASS'],bundle_id:handoff.bundle_id,package_id:handoff.package_id,publication_steps:results,requires_additional_human_approval:false,stopped_for_human:false,browser_handoff:{state:'READY_FOR_CLOUD_BROWSER',destination:'note',package_id:handoff.package_id,bundle_id:handoff.bundle_id}}; }
export async function publicationZipE2EPlan({zipPath,expectedPackageId,extractionDirectory}) { const handoff=await verifyBundleZip({zipPath,expectedPackageId,extractionDirectory}); const plan=await publicationE2EPlan({bundleDirectory:path.dirname(handoff.paths.manifest),expectedPackageId}); return {...plan,transport:'single_zip',zip_path:path.resolve(zipPath)}; }

function parseArgs(argv){const result={_:[]};for(let i=0;i<argv.length;i+=1){const item=argv[i];if(!item.startsWith('--'))result._.push(item);else{const value=argv[i+1];requireValue(value&&!value.startsWith('--'),'ARGUMENT_VALUE_REQUIRED',item);result[item.slice(2)]=value;i+=1;}}return result;}
async function main(){const args=parseArgs(process.argv.slice(2));const command=args._[0];let result;const binding=()=>({packagePath:path.resolve(args.package),humanEventPath:path.resolve(args['human-event']),approvalPath:path.resolve(args.approval),actualPackagePath:path.resolve(args['actual-package']||args.package),sourceManifestPath:path.resolve(args['source-manifest']),d3BodyPath:path.resolve(args.body),headerPath:path.resolve(args.header)});if(command==='validate-approval')result=await validateApprovedPackageBinding(binding());else if(command==='build')result=await buildPublicationBundle({...binding(),outputDirectory:path.resolve(args['output-directory'])});else if(command==='verify-directory')result=await verifyBundleDirectory({bundleDirectory:path.resolve(args['bundle-directory']),expectedPackageId:args['expected-package-id']});else if(command==='verify-zip')result=await verifyBundleZip({zipPath:path.resolve(args.zip),expectedPackageId:args['expected-package-id'],extractionDirectory:path.resolve(args['extraction-directory'])});else if(command==='g5')result=await validateG5({bundleDirectory:path.resolve(args['bundle-directory']),expectedPackageId:args['expected-package-id']});else if(command==='e2e')result=await publicationE2EPlan({bundleDirectory:path.resolve(args['bundle-directory']),expectedPackageId:args['expected-package-id']});else if(command==='e2e-zip')result=await publicationZipE2EPlan({zipPath:path.resolve(args.zip),expectedPackageId:args['expected-package-id'],extractionDirectory:path.resolve(args['extraction-directory'])});else fail('PUBLICATION_RUNTIME_USAGE','validate-approval|build|verify-directory|verify-zip|g5|e2e|e2e-zip');console.log(JSON.stringify(result));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch((error)=>{console.error(error.message);process.exitCode=1;});
