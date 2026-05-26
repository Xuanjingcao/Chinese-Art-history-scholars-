import assert from 'node:assert/strict';
import {
  getCloudBaseConfig,
  getCloudBaseModeLabel,
} from '../src/lib/cloudbaseConfig.ts';

assert.deepEqual(
  getCloudBaseConfig({
    env: { VITE_CLOUDBASE_ENV: 'test-env' },
    hostname: 'localhost',
  }),
  {
    envId: 'test-env',
    enabled: false,
    isLocalHost: true,
    forceEnable: false,
    forceDisable: false,
  },
);

assert.equal(
  getCloudBaseConfig({
    env: {
      VITE_CLOUDBASE_ENV: 'test-env',
      VITE_ENABLE_CLOUDBASE: 'true',
    },
    hostname: 'localhost',
  }).enabled,
  true,
);

assert.equal(
  getCloudBaseConfig({
    env: {
      VITE_CLOUDBASE_ENV: 'test-env',
      VITE_ENABLE_CLOUDBASE: 'true',
      VITE_DISABLE_CLOUDBASE: 'true',
    },
    hostname: 'localhost',
  }).enabled,
  false,
);

assert.equal(
  getCloudBaseModeLabel({
    env: { VITE_CLOUDBASE_ENV: 'test-env' },
    hostname: 'localhost',
  }),
  '本地模式',
);

assert.equal(
  getCloudBaseModeLabel({
    env: {
      VITE_CLOUDBASE_ENV: 'test-env',
      VITE_ENABLE_CLOUDBASE: 'true',
    },
    hostname: 'localhost',
  }),
  '云端后台',
);

console.log('cloudbase config checks passed');
