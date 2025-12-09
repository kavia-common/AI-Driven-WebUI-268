<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { DmzResponse } from '../../../types/dmz';
import { getDmz, updateDmz } from '../../../services/api/dmz';
import { useQA } from '../../../utils/qa';
const { isQAMode, qa, slug } = useQA();

const { t } = useI18n();
const dmzData = ref<DmzResponse | null>(null);
const loading = ref(false);
const showSuccess = ref(false);
const error = ref<string | null>(null);

const fetchDmz = async () => {
  loading.value = true;
  error.value = null;
  try {
    dmzData.value = await getDmz();
  } catch (err) {
    console.error('Error fetching DMZ settings:', err);
    error.value = 'Failed to fetch DMZ settings';
  } finally {
    loading.value = false;
  }
};

// Validation function for IP address
const isValidIPv4 = (ip: string): boolean => {
  if (ip === "0.0.0.0") return true;
  
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
};

const showSuccessMessage = () => {
  showSuccess.value = true;
  setTimeout(() => {
    showSuccess.value = false;
  }, 3000);
};

const handleSubmit = async () => {
  if (!dmzData.value) return;
  
  error.value = null;
  
  // Validate IP address if DMZ is enabled
  if (dmzData.value.AdvancedDmz.Enable && !isValidIPv4(dmzData.value.AdvancedDmz.IPAddress)) {
    error.value = 'Invalid IP address format';
    return;
  }

  loading.value = true;
  try {
    await updateDmz({
      AdvancedDmz: {
        Enable: dmzData.value.AdvancedDmz.Enable,
        IPAddress: dmzData.value.AdvancedDmz.Enable ? dmzData.value.AdvancedDmz.IPAddress : "0.0.0.0"
      }
    });
    showSuccessMessage();
    await fetchDmz();
  } catch (err) {
    console.error('Error updating DMZ settings:', err);
    error.value = 'Failed to update DMZ settings';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchDmz);
</script>

<template>
  <div class="page-container">
    <h1 class="page-title" :data-testid="qa('dmz-title')">{{ t('dmz.title') }}</h1>

    <div class="status-content" :data-testid="qa('dmz-content')">
      <div v-if="loading && !dmzData" class="loading-state" :data-testid="qa('dmz-loading')">
        <div class="loading-spinner"></div>
        <span>{{ t('common.loading') }}</span>
      </div>

      <div v-else-if="error" class="error-state" :data-testid="qa('dmz-error')">
        {{ error }}
      </div>

      <div v-else-if="dmzData" class="panel-section" :data-testid="qa('dmz-panel')">
        <div class="card-content">
          <div class="form-group">
            <div class="switch-label">
              <span :data-testid="qa('dmz-enable-label')">{{ t('dmz.enable') }}</span>
              <label class="switch">
                <input
                  type="checkbox"
                  :data-testid="qa('dmz-enable-toggle')"
                  v-model="dmzData.AdvancedDmz.Enable"
                >
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="form-row" v-if="dmzData.AdvancedDmz.Enable">
            <label class="form-label" :data-testid="qa('dmz-ip-address-label')">{{ t('dmz.ipAddress') }}</label>
            <input
              type="text"
              class="form-control input"
              :data-testid="qa('dmz-ip-address-input')"
              v-model="dmzData.AdvancedDmz.IPAddress"
              placeholder="192.168.101.168"
              required
            />
          </div>

          <div class="button-group">
            <button type="button" class="btn btn-secondary" :data-testid="qa('dmz-cancel-button')" @click="fetchDmz">
              {{ t('common.cancel') }}
            </button>
            <button type="button" class="btn btn-primary" :data-testid="qa('dmz-apply-button')" @click="handleSubmit">
              {{ t('common.apply') }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showSuccess" class="toast-success" :data-testid="qa('dmz-success-message')">
        {{ t('common.apply') }} successful
      </div>
    </div>
  </div>
</template>

<style scoped>
.switch-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-primary);
}
</style>