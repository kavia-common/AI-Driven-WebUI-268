<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { LanBasicResponse, IPAddressReservation } from '../../../types/lanBasic';
import { getLanBasic, updateLanBasic } from '../../../services/api/lanBasic';
import { useQA } from '../../../utils/qa';
const { isQAMode, qa, slug } = useQA();

const { t } = useI18n();
const lanData = ref<LanBasicResponse | null>(null);
const loading = ref(false);
const showSuccess = ref(false);
const error = ref<string | null>(null);
const editingIndex = ref<number | null>(null);

// Local state for IP Address Reservation
const reservations = ref<IPAddressReservation[]>([]);
const tempReservation = ref<IPAddressReservation>({
  MACAddress: '',
  IPAddress: '',
  Enable: 1
});

// Validation functions
const isValidIPv4 = (ip: string): boolean => {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
};

const isValidSubnetMask = (mask: string): boolean => {
  const maskRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!maskRegex.test(mask)) return false;

  const parts = mask.split('.').map(part => parseInt(part, 10));
  let binary = '';
  parts.forEach(num => {
    binary += num.toString(2).padStart(8, '0');
  });

  // Valid subnet masks should have continuous 1s followed by continuous 0s
  return /^1+0*$/.test(binary);
};

const isValidMACAddress = (mac: string): boolean => {
  return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac);
};

const isIPInRange = (ip: string, beginIp: string, endIp: string): boolean => {
  const ipToNumber = (ip: string): number => {
    const parts = ip.split('.').map(part => parseInt(part, 10));
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  };

  const ipNum = ipToNumber(ip);
  const beginNum = ipToNumber(beginIp);
  const endNum = ipToNumber(endIp);

  return ipNum >= beginNum && ipNum <= endNum;
};

const validateIPInput = (ip: string): string => {
  if (!ip) return '';
  const parts = ip.split('.');
  return parts.map(part => {
    const num = parseInt(part, 10);
    if (isNaN(num)) return '0';
    return Math.min(255, Math.max(0, num)).toString();
  }).join('.');
};

const validateLeaseTime = (time: number): number => {
  if (isNaN(time)) return 43200; // Default to 12 hours
  return Math.max(300, Math.min(604800, time)); // Between 5 minutes and 7 days
};

const fetchLanBasic = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await getLanBasic();
    lanData.value = response;
    reservations.value = [...response.LanBasic.IPAddressReservation];
  } catch (err) {
    console.error('Error fetching LAN basic:', err);
    error.value = 'Failed to fetch LAN settings';
  } finally {
    loading.value = false;
  }
};

const handleAddReservation = () => {
  reservations.value.push({
    MACAddress: '',
    IPAddress: '',
    Enable: 1
  });
  editingIndex.value = reservations.value.length - 1;
};

const validateReservation = (reservation: IPAddressReservation): boolean => {
  if (!isValidMACAddress(reservation.MACAddress)) {
    error.value = 'Invalid MAC address format';
    return false;
  }

  if (!isValidIPv4(reservation.IPAddress)) {
    error.value = 'Invalid IP address format';
    return false;
  }

  if (lanData.value && lanData.value.LanBasic.DHCPv4Setting.Enable) {
    const { BeginAddress, EndAddress } = lanData.value.LanBasic.DHCPv4Setting;
    if (!isIPInRange(reservation.IPAddress, BeginAddress, EndAddress)) {
      error.value = 'Reserved IP must be within DHCP range';
      return false;
    }
  }

  return true;
};

const handleConfirmReservation = (index: number) => {
  const reservation = reservations.value[index];
  if (!validateReservation(reservation)) {
    return;
  }
  editingIndex.value = null;
  error.value = null;
};

const handleCancelReservation = (index: number) => {
  if (reservations.value[index].MACAddress === '' && reservations.value[index].IPAddress === '') {
    reservations.value.splice(index, 1);
  }
  editingIndex.value = null;
  error.value = null;
};

const handleEditReservation = (index: number) => {
  editingIndex.value = index;
  tempReservation.value = { ...reservations.value[index] };
};

const handleDeleteReservation = (index: number) => {
  reservations.value.splice(index, 1);
  editingIndex.value = null;
};

const validateLANSettings = (): boolean => {
  if (!lanData.value) return false;

  const { LANIPSetting, DHCPv4Setting } = lanData.value.LanBasic;

  // Validate LAN IP
  if (!isValidIPv4(LANIPSetting.IPAddress)) {
    error.value = 'Invalid LAN IP address format';
    return false;
  }

  if (!isValidSubnetMask(LANIPSetting.SubnetMask)) {
    error.value = 'Invalid subnet mask format';
    return false;
  }

  // Validate DHCP settings if enabled
  if (DHCPv4Setting.Enable) {
    if (!isValidIPv4(DHCPv4Setting.BeginAddress)) {
      error.value = 'Invalid DHCP start address';
      return false;
    }

    if (!isValidIPv4(DHCPv4Setting.EndAddress)) {
      error.value = 'Invalid DHCP end address';
      return false;
    }

    if (!isValidSubnetMask(DHCPv4Setting.SubnetMask)) {
      error.value = 'Invalid DHCP subnet mask';
      return false;
    }

    // Validate DHCP range is within LAN subnet
    const ipToNumber = (ip: string): number => {
      const parts = ip.split('.').map(part => parseInt(part, 10));
      return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    };

    const maskToNumber = (mask: string): number => {
      const parts = mask.split('.').map(part => parseInt(part, 10));
      return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    };

    const lanIp = ipToNumber(LANIPSetting.IPAddress);
    const lanMask = maskToNumber(LANIPSetting.SubnetMask);
    const beginIp = ipToNumber(DHCPv4Setting.BeginAddress);
    const endIp = ipToNumber(DHCPv4Setting.EndAddress);
    const networkAddr = lanIp & lanMask;
    const broadcastAddr = networkAddr | (~lanMask >>> 0);

    if (beginIp < networkAddr || beginIp > broadcastAddr) {
      error.value = 'DHCP start address must be within LAN subnet';
      return false;
    }

    if (endIp < networkAddr || endIp > broadcastAddr) {
      error.value = 'DHCP end address must be within LAN subnet';
      return false;
    }

    if (beginIp >= endIp) {
      error.value = 'DHCP start address must be lower than end address';
      return false;
    }

    // Validate DNS server if provided
    if (DHCPv4Setting.DNSServers && !DHCPv4Setting.DNSServers.split(',').every(ip => isValidIPv4(ip.trim()))) {
      error.value = 'Invalid DNS server address';
      return false;
    }
  }

  return true;
};

const handleApply = async () => {
  if (!lanData.value) return;
  
  error.value = null;
  if (!validateLANSettings()) {
    return;
  }

  loading.value = true;
  try {
    await updateLanBasic({
      LanBasic: {
        LANIPSetting: lanData.value.LanBasic.LANIPSetting,
        DHCPv4Setting: {
          ...lanData.value.LanBasic.DHCPv4Setting,
          LeaseTime: validateLeaseTime(lanData.value.LanBasic.DHCPv4Setting.LeaseTime)
        },
        IPAddressReservation: reservations.value
      }
    });
    showSuccess.value = true;
    setTimeout(() => {
      showSuccess.value = false;
    }, 3000);
    await fetchLanBasic();
  } catch (err) {
    console.error('Error updating LAN settings:', err);
    error.value = 'Failed to update LAN settings';
  } finally {
    loading.value = false;
  }
};

const handleIPInput = (event: Event, field: string) => {
  if (!lanData.value) return;
  
  const input = event.target as HTMLInputElement;
  const validatedIP = validateIPInput(input.value);
  
  if (field === 'lanIP') {
    lanData.value.LanBasic.LANIPSetting.IPAddress = validatedIP;
  } else if (field === 'dnsServer') {
    lanData.value.LanBasic.DHCPv4Setting.DNSServers = validatedIP;
  } else if (field === 'beginAddress') {
    lanData.value.LanBasic.DHCPv4Setting.BeginAddress = validatedIP;
  } else if (field === 'endAddress') {
    lanData.value.LanBasic.DHCPv4Setting.EndAddress = validatedIP;
  }
};

onMounted(fetchLanBasic);
</script>

<template>
  <div class="ipv4-configuration panel-inline" :data-testid="qa('ipv4-configuration-content')">
    <div v-if="loading" class="loading-state" :data-testid="qa('ipv4-configuration-loading')">
      <div class="loading-spinner"></div>
      <span>{{ t('common.loading') }}</span>
    </div>

    <div v-else-if="error" class="error-state" :data-testid="qa('ipv4-configuration-error')">
      {{ error }}
    </div>

    <template v-else-if="lanData">
      <!-- LAN IP Setting -->
      <div class="panel-section" :data-testid="qa('ipv4-configuration-lan-ip-section')">
        <div class="section-title" :data-testid="qa('ipv4-configuration-lan-ip-title')">{{ t('lanBasic.lanIpSetting') }}</div>
        <div class="card-content" :data-testid="qa('ipv4-configuration-lan-ip-content')">
          <div class="form-group">
            <div class="switch-label">
              <span class="form-label" :data-testid="qa('ipv4-configuration-lan-ip-enable-label')">{{ t('lanBasic.enable') }}</span>
              <label class="switch">
                <input
                  type="checkbox"
                  :data-testid="qa('ipv4-configuration-lan-ip-enable-toggle')"
                  v-model="lanData.LanBasic.LANIPSetting.Enable"
                  :true-value="1"
                  :false-value="0"
                >
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" :data-testid="qa('ipv4-configuration-lan-ip-address-label')">{{ t('lanBasic.ipAddress') }}</label>
            <input
              type="text"
              class="form-input"
              :data-testid="qa('ipv4-configuration-lan-ip-address-input')"
              :value="lanData.LanBasic.LANIPSetting.IPAddress"
              @input="handleIPInput($event, 'lanIP')"
              :disabled="!lanData.LanBasic.LANIPSetting.Enable"
              placeholder="192.168.1.1"
            />
          </div>

          <div class="form-group">
            <label class="form-label" :data-testid="qa('ipv4-configuration-lan-ip-subnet-mask-label')">{{ t('lanBasic.subnetMask') }}</label>
            <input
              type="text"
              class="form-input"
              :data-testid="qa('ipv4-configuration-lan-ip-subnet-mask-input')"
              v-model="lanData.LanBasic.LANIPSetting.SubnetMask"
              :disabled="!lanData.LanBasic.LANIPSetting.Enable"
              placeholder="255.255.255.0"
            />
          </div>
        </div>
      </div>

      <!-- DHCPv4 Setting -->
      <div class="panel-section" :data-testid="qa('ipv4-configuration-dhcp-section')">
        <div class="section-title" :data-testid="qa('ipv4-configuration-dhcp-title')">{{ t('lanBasic.dhcpv4Setting') }}</div>
        <div class="card-content" :data-testid="qa('ipv4-configuration-dhcp-content')">
          <div class="form-group">
            <div class="switch-label">
              <span class="form-label" :data-testid="qa('ipv4-configuration-dhcp-enable-label')">{{ t('lanBasic.enableDhcpServer') }}</span>
              <label class="switch">
                <input
                  type="checkbox"
                  :data-testid="qa('ipv4-configuration-dhcp-enable-toggle')"
                  v-model="lanData.LanBasic.DHCPv4Setting.Enable"
                  :true-value="1"
                  :false-value="0"
                >
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" :data-testid="qa('ipv4-configuration-dhcp-dns-server-label')">{{ t('lanBasic.dnsServer') }}</label>
            <input
              type="text"
              class="form-input"
              :data-testid="qa('ipv4-configuration-dhcp-dns-server-input')"
              :value="lanData.LanBasic.DHCPv4Setting.DNSServers"
              @input="handleIPInput($event, 'dnsServer')"
              :disabled="!lanData.LanBasic.DHCPv4Setting.Enable"
              placeholder="192.168.1.1"
            />
          </div>

          <div class="form-group">
            <label class="form-label" :data-testid="qa('ipv4-configuration-dhcp-begin-address-label')">{{ t('lanBasic.beginAddress') }}</label>
            <input
              type="text"
              class="form-input"
              :data-testid="qa('ipv4-configuration-dhcp-begin-address-input')"
              :value="lanData.LanBasic.DHCPv4Setting.BeginAddress"
              @input="handleIPInput($event, 'beginAddress')"
              :disabled="!lanData.LanBasic.DHCPv4Setting.Enable"
              placeholder="192.168.1.2"
            />
          </div>

          <div class="form-group">
            <label class="form-label" :data-testid="qa('ipv4-configuration-dhcp-end-address-label')">{{ t('lanBasic.endAddress') }}</label>
            <input
              type="text"
              class="form-input"
              :data-testid="qa('ipv4-configuration-dhcp-end-address-input')"
              :value="lanData.LanBasic.DHCPv4Setting.EndAddress"
              @input="handleIPInput($event, 'endAddress')"
              :disabled="!lanData.LanBasic.DHCPv4Setting.Enable"
              placeholder="192.168.1.254"
            />
          </div>

          <div class="form-group">
            <label class="form-label" :data-testid="qa('ipv4-configuration-dhcp-subnet-mask-label')">{{ t('lanBasic.subnetMask') }}</label>
            <input
              type="text"
              class="form-input"
              :data-testid="qa('ipv4-configuration-dhcp-subnet-mask-input')"
              v-model="lanData.LanBasic.DHCPv4Setting.SubnetMask"
              :disabled="!lanData.LanBasic.DHCPv4Setting.Enable"
              placeholder="255.255.255.0"
            />
          </div>

          <div class="form-group">
            <label class="form-label" :data-testid="qa('ipv4-configuration-dhcp-lease-time-label')">{{ t('lanBasic.leaseTime') }}</label>
            <div class="input-group" :data-testid="qa('ipv4-configuration-dhcp-lease-time-container')">
              <input
                type="number"
                class="form-input"
                :data-testid="qa('ipv4-configuration-dhcp-lease-time-input')"
                v-model="lanData.LanBasic.DHCPv4Setting.LeaseTime"
                :disabled="!lanData.LanBasic.DHCPv4Setting.Enable"
                min="300"
                max="604800"
              />
              <span class="input-group-append" :data-testid="qa('ipv4-configuration-dhcp-lease-time-unit')">
                {{ t('lanBasic.seconds') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- IP Address Reservation -->
      <div class="panel-section" :data-testid="qa('ipv4-configuration-reservation-section')">
        <div class="header-row">
          <div class="section-title-sp" :data-testid="qa('ipv4-configuration-reservation-title')">{{ t('lanBasic.ipAddressReservation') }}</div>
          <button class="btn btn-primary" :data-testid="qa('ipv4-configuration-reservation-add-button')" @click="handleAddReservation">
            <span class="material-icons">add</span>
            {{ t('lanBasic.add') }}
          </button>
        </div>

        <div class="card-content" :data-testid="qa('ipv4-configuration-reservation-content')">
          <div class="table-container" :data-testid="qa('ipv4-configuration-reservation-table-container')">
            <table :data-testid="qa('ipv4-configuration-reservation-table')">
              <thead>
                <tr>
                  <th :data-testid="qa('ipv4-configuration-reservation-header-mac')">{{ t('lanBasic.macAddress') }}</th>
                  <th :data-testid="qa('ipv4-configuration-reservation-header-ip')">{{ t('lanBasic.ipAddress') }}</th>
                  <th :data-testid="qa('ipv4-configuration-reservation-header-enable')">{{ t('lanBasic.enable') }}</th>
                  <th :data-testid="qa('ipv4-configuration-reservation-header-action')">{{ t('lanBasic.action') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(reservation, resIndex) in reservations" :key="resIndex" :data-testid="qa(`ipv4-configuration-reservation-row-${resIndex}`)">
                  <td>
                    <input
                      v-if="editingIndex === resIndex"
                      type="text"
                      class="form-input"
                      :data-testid="qa(`ipv4-configuration-reservation-mac-input-${resIndex}`)"
                      v-model="reservation.MACAddress"
                      placeholder="00:11:22:33:44:55"
                    />
                    <span v-else :data-testid="qa(`ipv4-configuration-reservation-mac-value-${resIndex}`)">{{ reservation.MACAddress }}</span>
                  </td>
                  <td>
                    <input
                      v-if="editingIndex === resIndex"
                      type="text"
                      class="form-input"
                      :data-testid="qa(`ipv4-configuration-reservation-ip-input-${resIndex}`)"
                      v-model="reservation.IPAddress"
                      placeholder="192.168.1.100"
                    />
                    <span v-else :data-testid="qa(`ipv4-configuration-reservation-ip-value-${resIndex}`)">{{ reservation.IPAddress }}</span>
                  </td>
                  <td>
                    <div class="switch-label" :data-testid="qa(`ipv4-configuration-reservation-enable-container-${resIndex}`)">
                      <label class="switch">
                        <input
                          type="checkbox"
                          :data-testid="qa(`ipv4-configuration-reservation-enable-toggle-${resIndex}`)"
                          v-model="reservation.Enable"
                          :true-value="1"
                          :false-value="0"
                        >
                        <span class="slider"></span>
                      </label>
                    </div>
                  </td>
                  <td>
                    <div class="action-buttons" :data-testid="qa(`ipv4-configuration-reservation-actions-${resIndex}`)">
                      <template v-if="editingIndex === resIndex">
                        <button class="btn-action" :data-testid="qa(`ipv4-configuration-reservation-confirm-${resIndex}`)" @click="handleConfirmReservation(resIndex)">
                          <span class="material-icons">check</span>
                        </button>
                        <button class="btn-action" :data-testid="qa(`ipv4-configuration-reservation-cancel-${resIndex}`)" @click="handleCancelReservation(resIndex)">
                          <span class="material-icons">close</span>
                        </button>
                      </template>
                      <template v-else>
                        <button class="btn-action" :data-testid="qa(`ipv4-configuration-reservation-edit-${resIndex}`)" @click="handleEditReservation(resIndex)">
                          <span class="material-icons">edit</span>
                        </button>
                        <button class="btn-action" :data-testid="qa(`ipv4-configuration-reservation-delete-${resIndex}`)" @click="handleDeleteReservation(resIndex)">
                          <span class="material-icons">delete</span>
                        </button>
                      </template>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mobile-cards" :data-testid="qa('ipv4-configuration-reservation-mobile')">
            <div 
              class="table-card" 
              v-for="(reservation, resIndex) in reservations" 
              :key="resIndex"
              :data-testid="qa(`ipv4-configuration-reservation-card-${resIndex}`)"
            >
              <div class="card-row">
                <span class="card-label form-label" :data-testid="qa(`ipv4-configuration-reservation-card-mac-label-${resIndex}`)">{{ t('lanBasic.macAddress') }}</span>
                <span class="card-value">
                  <input
                    v-if="editingIndex === resIndex"
                    type="text"
                    class="form-input"
                    :data-testid="qa(`ipv4-configuration-reservation-card-mac-input-${resIndex}`)"
                    v-model="reservation.MACAddress"
                    placeholder="00:11:22:33:44:55"
                  />
                  <span v-else :data-testid="qa(`ipv4-configuration-reservation-card-mac-value-${resIndex}`)">{{ reservation.MACAddress }}</span>
                </span>
              </div>
              <div class="card-row">
                <span class="card-label form-label" :data-testid="qa(`ipv4-configuration-reservation-card-ip-label-${resIndex}`)">{{ t('lanBasic.ipAddress') }}</span>
                <span class="card-value">
                  <input
                    v-if="editingIndex === resIndex"
                    type="text"
                    class="form-input"
                    :data-testid="qa(`ipv4-configuration-reservation-card-ip-input-${resIndex}`)"
                    v-model="reservation.IPAddress"
                    placeholder="192.168.1.100"
                  />
                  <span v-else :data-testid="qa(`ipv4-configuration-reservation-card-ip-value-${resIndex}`)">{{ reservation.IPAddress }}</span>
                </span>
              </div>
              <div class="card-row">
                <span class="card-label" :data-testid="qa(`ipv4-configuration-reservation-card-enable-label-${resIndex}`)">{{ t('lanBasic.enable') }}</span>
                <div class="switch-label" :data-testid="qa(`ipv4-configuration-reservation-card-enable-container-${resIndex}`)">
                  <label class="switch">
                    <input
                      type="checkbox"
                      :data-testid="qa(`ipv4-configuration-reservation-card-enable-toggle-${resIndex}`)"
                      v-model="reservation.Enable"
                      :true-value="1"
                      :false-value="0"
                    >
                    <span class="slider"></span>
                  </label>
                </div>
              </div>
              <div class="card-actions" :data-testid="qa(`ipv4-configuration-reservation-card-actions-${resIndex}`)">
                <template v-if="editingIndex === resIndex">
                  <button class="btn-action" :data-testid="qa(`ipv4-configuration-reservation-card-confirm-${resIndex}`)" @click="handleConfirmReservation(resIndex)">
                    <span class="material-icons">check</span>
                  </button>
                  <button class="btn-action" :data-testid="qa(`ipv4-configuration-reservation-card-cancel-${resIndex}`)" @click="handleCancelReservation(resIndex)">
                    <span class="material-icons">close</span>
                  </button>
                </template>
                <template v-else>
                  <button class="btn-action" :data-testid="qa(`ipv4-configuration-reservation-card-edit-${resIndex}`)" @click="handleEditReservation(resIndex)">
                    <span class="material-icons">edit</span>
                  </button>
                  <button class="btn-action" :data-testid="qa(`ipv4-configuration-reservation-card-delete-${resIndex}`)" @click="handleDeleteReservation(resIndex)">
                    <span class="material-icons">delete</span>
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="button-group">
        <button 
          class="btn btn-secondary" 
          :data-testid="qa('ipv4-configuration-cancel-button')"
          @click="fetchLanBasic"
        >
          {{ t('lanBasic.cancel') }}
        </button>
        <button 
          class="btn btn-primary"
          :data-testid="qa('ipv4-configuration-apply-button')"
          @click="handleApply"
        >
          {{ t('lanBasic.apply') }}
        </button>
      </div>
    </template>

    <div v-if="showSuccess" class="toast-success" :data-testid="qa('ipv4-configuration-success-message')">
      {{ t('common.apply') }} successful
    </div>
  </div>
</template>

<style scoped>
.ipv4-configuration {
  padding: 0;
}

.section-title {
  padding: 1rem 1.5rem;
  font-size: 1rem;
  color: var(--text-primary);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 1.5rem;
  background-color: white;
  border-bottom: 1px solid var(--border-color);
}

@media (max-width: 768px) {
  .ipv4-configuration {
    padding: 0;
  }

  .header-row {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .table-container {
    display: none;
  }

  .mobile-cards {
    display: block;
  }

  .card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }
}
</style>