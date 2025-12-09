<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { DdnsService, DdnsResponse } from '../../types/ddns';
import { getDdns, updateDdns } from '../../services/api';
import { useQA } from '../../utils/qa';
const { isQAMode, qa, slug } = useQA();

const { t } = useI18n();
const ddnsData = ref<DdnsResponse | null>(null);
const isEditing = ref(false);
const editingService = ref<DdnsService | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const showSuccess = ref(false);

const fetchDdns = async () => {
  loading.value = true;
  error.value = null;
  try {
    ddnsData.value = await getDdns();
  } catch (err) {
    console.error('Error fetching DDNS settings:', err);
    error.value = 'Failed to fetch DDNS settings';
  } finally {
    loading.value = false;
  }
};

const handleEdit = (service: DdnsService) => {
  editingService.value = { ...service };
  isEditing.value = true;
};

const handleDelete = async (serviceId: string) => {
  if (!ddnsData.value) return;
  
  if (!confirm(t('ddns.confirmDelete'))) return;

  try {
    const updatedServices = ddnsData.value.Ddns.Service.filter(s => s.ID !== serviceId);
    await updateDdns({
      Ddns: {
        Service: updatedServices
      }
    });
    await fetchDdns();
  } catch (error) {
    console.error('Error deleting DDNS service:', error);
  }
};

const handleAdd = () => {
  if (!ddnsData.value) return;
  
  const newId = `no-${ddnsData.value.Ddns.ServNum + 1}`;
  editingService.value = {
    ID: newId,
    ServProv: ddnsData.value.Ddns.SupServProv[0],
    ServUsername: '',
    ServPassword: '',
    DomainName: '',
    UpdatedIP: ddnsData.value.Ddns.Interfaces[0],
    HostEnable: 1
  };
  isEditing.value = true;
};

const showSuccessMessage = () => {
  showSuccess.value = true;
  setTimeout(() => {
    showSuccess.value = false;
  }, 3000);
};

const handleSave = async (service: DdnsService) => {
  if (!ddnsData.value) return;

  try {
    const existingIndex = ddnsData.value.Ddns.Service.findIndex(s => s.ID === service.ID);
    let updatedServices: DdnsService[];
    
    if (existingIndex >= 0) {
      updatedServices = [...ddnsData.value.Ddns.Service];
      updatedServices[existingIndex] = service;
    } else {
      updatedServices = [...ddnsData.value.Ddns.Service, service];
    }

    await updateDdns({
      Ddns: {
        Service: updatedServices
      }
    });
    
    showSuccessMessage();
    isEditing.value = false;
    editingService.value = null;
    await fetchDdns();
  } catch (error) {
    console.error('Error saving DDNS service:', error);
  }
};

const handleCancel = () => {
  isEditing.value = false;
  editingService.value = null;
};

onMounted(fetchDdns);
</script>

<template>
  <div class="page-container">
    <h1 class="page-title" :data-testid="qa('ddns-title')">{{ t('ddns.title') }}</h1>

    <div class="status-content" :data-testid="qa('ddns-content')">
      <div v-if="loading" class="loading-state" :data-testid="qa('ddns-loading')">
        <div class="loading-spinner"></div>
        <span>{{ t('common.loading') }}</span>
      </div>

      <div v-else-if="error" class="error-state" :data-testid="qa('ddns-error')">
        {{ error }}
      </div>

      <template v-else>
        <div class="panel-section" :data-testid="qa('ddns-panel')">
          <div v-if="!isEditing" class="management-view" :data-testid="qa('ddns-management-view')">
            <div class="header-row">
              <div class="section-title-sp" :data-testid="qa('ddns-management-title')">{{ t('ddns.management') }}</div>
              <div class="actions">
                <button class="btn btn-primary" :data-testid="qa('ddns-add-service-button')" @click="handleAdd">
                  {{ t('ddns.addService') }}
                </button>
                <button class="btn btn-secondary" :data-testid="qa('ddns-refresh-button')" @click="fetchDdns">
                  {{ t('ddns.refresh') }}
                </button>
              </div>
            </div>

            <div class="card-content">
              <div class="table-container" :data-testid="qa('ddns-table')">
                <table>
                  <thead>
                    <tr>
                      <th :data-testid="qa('ddns-header-no')">{{ t('ddns.no') }}</th>
                      <th :data-testid="qa('ddns-header-provider')">{{ t('ddns.provider') }}</th>
                      <th :data-testid="qa('ddns-header-domain')">{{ t('ddns.domain') }}</th>
                      <th :data-testid="qa('ddns-header-status')">{{ t('ddns.status') }}</th>
                      <th :data-testid="qa('ddns-header-last-update')">{{ t('ddns.lastUpdate') }}</th>
                      <th :data-testid="qa('ddns-header-action')">{{ t('ddns.action') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(service, index) in ddnsData?.Ddns.Service" :key="service.ID" :data-testid="qa(`ddns-row-${index}`)">
                      <td :data-testid="qa(`ddns-no-${index}`)">{{ index + 1 }}</td>
                      <td :data-testid="qa(`ddns-provider-${index}`)">{{ service.ServProv }}</td>
                      <td :data-testid="qa(`ddns-domain-${index}`)">{{ service.DomainName }}</td>
                      <td :data-testid="qa(`ddns-status-${index}`)">{{ service.Status }}</td>
                      <td :data-testid="qa(`ddns-last-update-${index}`)">{{ service.LastUpdate }}</td>
                      <td>
                        <div class="action-buttons">
                          <button class="btn-action" :data-testid="qa(`ddns-edit-button-${index}`)" @click="handleEdit(service)" title="Edit">
                            <span class="material-icons">edit</span>
                          </button>
                          <button class="btn-action" :data-testid="qa(`ddns-delete-button-${index}`)" @click="handleDelete(service.ID)" title="Delete">
                            <span class="material-icons">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="mobile-cards" :data-testid="qa('ddns-mobile')">
                <div class="table-card" v-for="(service, index) in ddnsData?.Ddns.Service" :key="service.ID" :data-testid="qa(`ddns-card-${index}`)">
                  <div class="card-row">
                    <span class="card-label" :data-testid="qa(`ddns-card-no-label-${index}`)">{{ t('ddns.no') }}</span>
                    <span class="card-value" :data-testid="qa(`ddns-card-no-value-${index}`)">{{ index + 1 }}</span>
                  </div>
                  <div class="card-row">
                    <span class="card-label" :data-testid="qa(`ddns-card-provider-label-${index}`)">{{ t('ddns.provider') }}</span>
                    <span class="card-value" :data-testid="qa(`ddns-card-provider-value-${index}`)">{{ service.ServProv }}</span>
                  </div>
                  <div class="card-row">
                    <span class="card-label" :data-testid="qa(`ddns-card-domain-label-${index}`)">{{ t('ddns.domain') }}</span>
                    <span class="card-value" :data-testid="qa(`ddns-card-domain-value-${index}`)">{{ service.DomainName }}</span>
                  </div>
                  <div class="card-row">
                    <span class="card-label" :data-testid="qa(`ddns-card-status-label-${index}`)">{{ t('ddns.status') }}</span>
                    <span class="card-value" :data-testid="qa(`ddns-card-status-value-${index}`)">{{ service.Status }}</span>
                  </div>
                  <div class="card-row">
                    <span class="card-label" :data-testid="qa(`ddns-card-last-update-label-${index}`)">{{ t('ddns.lastUpdate') }}</span>
                    <span class="card-value" :data-testid="qa(`ddns-card-last-update-value-${index}`)">{{ service.LastUpdate }}</span>
                  </div>
                  <div class="card-actions">
                    <button class="btn-action" :data-testid="qa(`ddns-card-edit-button-${index}`)" @click="handleEdit(service)" title="Edit">
                      <span class="material-icons">edit</span>
                    </button>
                    <button class="btn-action" :data-testid="qa(`ddns-card-delete-button-${index}`)" @click="handleDelete(service.ID)" title="Delete">
                      <span class="material-icons">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="edit-view" :data-testid="qa('ddns-edit-view')">
            <h2 :data-testid="qa('ddns-edit-title')">{{ editingService?.ID ? t('ddns.editService') : t('ddns.addService') }}</h2>
            <form @submit.prevent="handleSave(editingService!)" v-if="editingService && ddnsData" :data-testid="qa('ddns-edit-form')">
              <div class="form-row">
                <label class="form-label" :data-testid="qa('ddns-edit-provider-label')">{{ t('ddns.provider') }}</label>
                <select
                  v-model="editingService.ServProv"
                  class="form-control select"
                  :data-testid="qa('ddns-edit-provider-select')"
                >
                  <option v-for="provider in ddnsData.Ddns.SupServProv" :key="provider" :value="provider">
                    {{ provider }}
                  </option>
                </select>
              </div>

              <div class="form-row">
                <label class="form-label" :data-testid="qa('ddns-edit-domain-label')">{{ t('ddns.domain') }}</label>
                <input 
                  type="text" 
                  class="form-control input"
                  :data-testid="qa('ddns-edit-domain-input')"
                  v-model="editingService.DomainName"
                  required
                >
              </div>

              <div class="form-row">
                <label class="form-label" :data-testid="qa('ddns-edit-username-label')">{{ t('ddns.username') }}</label>
                <input 
                  type="text" 
                  class="form-control input"
                  :data-testid="qa('ddns-edit-username-input')"
                  v-model="editingService.ServUsername"
                  required
                >
              </div>

              <div class="form-row">
                <label class="form-label" :data-testid="qa('ddns-edit-password-label')">{{ t('ddns.password') }}</label>
                <input 
                  type="password" 
                  class="form-control input"
                  :data-testid="qa('ddns-edit-password-input')"
                  v-model="editingService.ServPassword"
                  required
                >
              </div>

              <div class="form-row">
                <label class="form-label" :data-testid="qa('ddns-edit-interface-label')">{{ t('ddns.wanInterface') }}</label>
                <select
                  v-model="editingService.UpdatedIP"
                  class="form-control select"
                  :data-testid="qa('ddns-edit-interface-select')"
                >
                  <option v-for="iface in ddnsData.Ddns.Interfaces" :key="iface" :value="iface">
                    {{ iface }}
                  </option>
                </select>
              </div>

              <div class="form-row">
                <div class="switch-label">
                  <span :data-testid="qa('ddns-edit-enable-label')">{{ t('common.enable') }}</span>
                  <label class="switch">
                    <input
                      type="checkbox"
                      :data-testid="qa('ddns-edit-enable-toggle')"
                      v-model="editingService.HostEnable"
                      :true-value="1"
                      :false-value="0"
                    >
                    <span class="slider"></span>
                  </label>
                </div>
              </div>

              <div class="button-group">
                <button
                  type="button"
                  class="btn btn-secondary"
                  :data-testid="qa('ddns-edit-cancel-button')"
                  @click="handleCancel"
                >
                  {{ t('ddns.cancel') }}
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  :data-testid="qa('ddns-edit-save-button')"
                >
                  {{ t('ddns.save') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </template>

      <div v-if="showSuccess" class="toast-success" :data-testid="qa('ddns-success-message')">
        {{ t('common.apply') }} successful
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-title-sp {
  font-size: 1rem;
  color: var(--text-primary);
  padding: 0.5rem 0rem;
  background-color: white;
}

.actions {
  display: flex;
  gap: 1rem;
}

.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
}

.btn-action:hover {
  color: var(--text-primary);
}

.edit-view {
  padding: 1.5rem;
}

.edit-view h2 {
  margin: 0 0 1.5rem 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.switch-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-action .material-icons {
  font-size: 1.25rem;
}

@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .actions {
    flex-direction: column;
    width: 100%;
  }

  .actions .btn {
    width: 100%;
  }

  .edit-view {
    padding: 1rem;
  }

  .btn-danger {
    background-color: #dc3545;
    color: white;
  }

  .card-actions {
    justify-content: flex-end;
  }

  .btn-action {
    padding: 0.5rem;
  }
}
</style>