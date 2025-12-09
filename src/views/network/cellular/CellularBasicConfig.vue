<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getCellularStatus, updateCellularSettings } from '../../../services/api/cellular';
import type { CellularResponse } from '../../../types/cellular';
import { BaseInput, BaseSelect, BaseButton } from '../../../components/common';

type PreferredAccessTechOption = { label: string; value: string };

// Local UI state
const { t } = useI18n();
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

// Loaded backend data (for initial values / refresh)
const cellularData = ref<CellularResponse | null>(null);

// Form fields (as booleans/strings for UI)
const formInterfaceEnable = ref<boolean>(true);
const formRoamingEnabled = ref<boolean>(false);
const formIPType = ref<string>('ipv4v6');
const formAPN = ref<string>('internet');
const formPreferredAccessTechnology = ref<string>('5g');

// Options - try to read supported list from backend if present, else default
const preferredAccessTechOptions = ref<PreferredAccessTechOption[]>([
  { label: '4G/LTE', value: 'lte' },
  { label: '5G', value: '5g' },
]);

const ipTypeOptions = ref<PreferredAccessTechOption[]>([
  { label: 'IPv4', value: 'ipv4' },
  { label: 'IPv6', value: 'ipv6' },
  { label: 'IPv4/IPv6', value: 'ipv4v6' },
]);

const toBool = (v: number | boolean | undefined): boolean => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  return false;
};

const loadInitial = async () => {
  loading.value = true;
  error.value = null;
  success.value = null;
  try {
    const res = await getCellularStatus();
    cellularData.value = res;

    // Initialize form values from backend where possible
    formInterfaceEnable.value = toBool(res.Cellular?.InterfaceEnable);
    formRoamingEnabled.value = toBool(res.Cellular?.RoamingEnabled);
    formIPType.value = res.Cellular?.X_PRPLWARE_COM_IPType || 'ipv4v6';
    formAPN.value = res.Cellular?.APN || 'internet';

    // Map some common representations to UI-friendly values
    const prefRaw = res.Cellular?.PreferredAccessTechnology || '';
    const normalizedPref = prefRaw.toLowerCase();
    if (normalizedPref.includes('nr') || normalizedPref.includes('5g')) {
      formPreferredAccessTechnology.value = '5g';
    } else if (normalizedPref.includes('lte') || normalizedPref.includes('4g')) {
      formPreferredAccessTechnology.value = 'lte';
    } else {
      formPreferredAccessTechnology.value = '5g';
    }

    // If backend returns supported options, try to build options list
    const supported = res.Cellular?.SupportedAccessTechnologies;
    if (supported && typeof supported === 'string') {
      const items = supported.split(',').map(s => s.trim().toLowerCase());
      const opt: PreferredAccessTechOption[] = [];
      if (items.includes('nr') || items.includes('5g')) opt.push({ label: '5G', value: '5g' });
      if (items.includes('lte') || items.includes('4g')) opt.push({ label: '4G/LTE', value: 'lte' });
      if (opt.length) preferredAccessTechOptions.value = opt;
    }
  } catch (e) {
    console.error(e);
    error.value = t('common.saveFailed') as string;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadInitial();
});

const disabledSave = computed(() => saving.value || loading.value);

// Exact payload per requirement, with correct field mapping
const buildExactPayload = () => {
  return {
    Cellular: {
      RoamingEnabled: formRoamingEnabled.value,
      InterfaceEnable: formInterfaceEnable.value,
      X_PRPLWARE_COM_IPType: formIPType.value,
      APN: formAPN.value,
      PreferredAccessTechnology: formPreferredAccessTechnology.value,
    },
  };
};

const handleSave = async () => {
  error.value = null;
  success.value = null;
  saving.value = true;
  try {
    // The service will normalize booleans to numeric if backend expects numbers
    const payload = buildExactPayload();
    await updateCellularSettings(payload);
    success.value = t('common.saveSuccess') as string;
    await loadInitial();
  } catch (e) {
    console.error('Failed to save Cellular settings', e);
    error.value = t('common.saveFailed') as string;
  } finally {
    saving.value = false;
  }
};

const handleCancel = () => {
  loadInitial();
};
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">{{ t('menu.cellular') }}</h1>

    <div class="status-content">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>{{ t('common.loading') }}</span>
      </div>

      <div v-else-if="error" class="error-state" role="alert">
        {{ error }}
      </div>

      <template v-else>
        <div class="panel-section">
          <div class="card-content">
            <div v-if="success" class="alert alert-success" role="status">
              {{ success }}
            </div>

            <!-- One-field-per-row layout, consistent with NTP section -->
            <div class="form-group">
              <div class="switch-label">
                <span>{{ t('cellular.interfaceEnable') }}</span>
                <label class="form-switch">
                  <input type="checkbox" v-model="formInterfaceEnable" />
                  <span class="form-switch-slider"></span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <div class="switch-label">
                <span>{{ t('cellular.roamingEnabled') }}</span>
                <label class="form-switch">
                  <input type="checkbox" v-model="formRoamingEnabled" />
                  <span class="form-switch-slider"></span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <BaseSelect
                v-model="formIPType"
                :label="t('cellular.ipType') as string"
                :options="ipTypeOptions"
                :placeholder="t('common.placeholder') as string"
              />
            </div>

            <div class="form-group">
              <BaseInput
                v-model="formAPN"
                :label="t('cellular.apn') as string"
                :placeholder="t('common.placeholder') as string"
              />
            </div>

            <div class="form-group">
              <BaseSelect
                v-model="formPreferredAccessTechnology"
                :label="t('cellular.preferredAccessTechnology') as string"
                :options="preferredAccessTechOptions"
                :placeholder="t('common.placeholder') as string"
              />
            </div>

            <div class="button-group">
              <BaseButton variant="ghost" @click="handleCancel">
                {{ t('common.cancel') }}
              </BaseButton>
              <BaseButton
                variant="primary"
                :disabled="disabledSave"
                :loading="saving"
                @click="handleSave"
              >
                {{ t('ntp.apply') || 'Apply' }}
              </BaseButton>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.alert {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
}

.alert-danger {
  background-color: #ffe5e7;
  color: #9b1c1c;
  border: 1px solid #f5c2c7;
}

.alert-success {
  background-color: #e6ffed;
  color: #1f6f3e;
  border: 1px solid #badbcc;
}

.error-state {
  padding: 2rem;
  text-align: center;
  color: #dc3545;
  background-color: white;
  border-radius: 4px;
  box-shadow: var(--shadow-sm);
}

.loading-state {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.switch-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-primary);
}
</style>
