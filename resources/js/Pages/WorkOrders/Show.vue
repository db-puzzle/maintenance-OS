<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue'
import { Head, Link, useForm, router } from '@inertiajs/vue3'
import { ref } from 'vue'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PencilIcon, PlayIcon, CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  workOrder: Object,
  canTransitionTo: Array,
})

const showStatusModal = ref(false)
const selectedStatus = ref('')
const statusReason = ref('')

const statusForm = useForm({
  status: '',
  reason: '',
})

function openStatusModal(status) {
  selectedStatus.value = status
  statusReason.value = ''
  showStatusModal.value = true
}

function updateStatus() {
  statusForm.status = selectedStatus.value
  statusForm.reason = statusReason.value
  statusForm.post(route('work-orders.update-status', props.workOrder.id), {
    onSuccess: () => {
      showStatusModal.value = false
      selectedStatus.value = ''
      statusReason.value = ''
    },
  })
}

function startExecution() {
  router.post(route('work-orders.executions.create', props.workOrder.id))
}

function getStatusColor(status) {
  const colors = {
    requested: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    planned: 'bg-purple-100 text-purple-800',
    ready_to_schedule: 'bg-indigo-100 text-indigo-800',
    scheduled: 'bg-cyan-100 text-cyan-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    on_hold: 'bg-orange-100 text-orange-800',
    completed: 'bg-emerald-100 text-emerald-800',
    verified: 'bg-teal-100 text-teal-800',
    closed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getPriorityColor(priority) {
  const colors = {
    emergency: 'bg-red-100 text-red-800',
    urgent: 'bg-orange-100 text-orange-800',
    high: 'bg-yellow-100 text-yellow-800',
    normal: 'bg-blue-100 text-blue-800',
    low: 'bg-gray-100 text-gray-800',
  }
  return colors[priority] || 'bg-gray-100 text-gray-800'
}

function formatDate(date) {
  if (!date) return '-'
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
}

function formatCurrency(value) {
  if (!value) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}
</script>

<template>
  <Head :title="`Work Order ${workOrder.work_order_number}`" />

  <AuthenticatedLayout>
    <template #header>
      <div class="flex justify-between items-center">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
          Work Order {{ workOrder.work_order_number }}
        </h2>
        <div class="flex space-x-2">
          <Link
            v-if="['requested', 'approved', 'planned'].includes(workOrder.status)"
            :href="route('work-orders.edit', workOrder.id)"
            class="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-25 transition ease-in-out duration-150"
          >
            <PencilIcon class="-ml-1 mr-2 h-4 w-4" />
            Edit
          </Link>
          
          <Link
            v-if="workOrder.status === 'approved'"
            :href="route('work-orders.planning.edit', workOrder.id)"
            class="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:border-indigo-900 focus:ring ring-indigo-300 disabled:opacity-25 transition ease-in-out duration-150"
          >
            Plan Work Order
          </Link>
          
          <button
            v-if="['scheduled', 'in_progress'].includes(workOrder.status) && !workOrder.execution"
            @click="startExecution"
            class="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-700 active:bg-green-900 focus:outline-none focus:border-green-900 focus:ring ring-green-300 disabled:opacity-25 transition ease-in-out duration-150"
          >
            <PlayIcon class="-ml-1 mr-2 h-4 w-4" />
            Start Execution
          </button>
          
          <Link
            v-if="workOrder.execution"
            :href="route('work-orders.executions.show', [workOrder.id, workOrder.execution.id])"
            class="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-700 active:bg-green-900 focus:outline-none focus:border-green-900 focus:ring ring-green-300 disabled:opacity-25 transition ease-in-out duration-150"
          >
            View Execution
          </Link>
        </div>
      </div>
    </template>

    <div class="py-12">
      <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <!-- Status and Actions -->
        <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg mb-6">
          <div class="p-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-medium text-gray-900">Status</h3>
                <div class="mt-2">
                  <span :class="[getStatusColor(workOrder.status), 'px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full']">
                    {{ workOrder.status.replace(/_/g, ' ') }}
                  </span>
                </div>
              </div>
              <div v-if="canTransitionTo.length > 0" class="flex space-x-2">
                <button
                  v-for="transition in canTransitionTo"
                  :key="transition.value"
                  @click="openStatusModal(transition.value)"
                  class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {{ transition.label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Work Order Details -->
        <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
          <div class="p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Work Order Details</h3>
            
            <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt class="text-sm font-medium text-gray-500">Title</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ workOrder.title }}</dd>
              </div>
              
              <div>
                <dt class="text-sm font-medium text-gray-500">Type</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ workOrder.type.name }}</dd>
              </div>
              
              <div>
                <dt class="text-sm font-medium text-gray-500">Category</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  <span :class="[getCategoryColor(workOrder.work_order_category), 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full']">
                    {{ workOrder.work_order_category }}
                  </span>
                </dd>
              </div>
              
              <div>
                <dt class="text-sm font-medium text-gray-500">Priority</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  <span :class="[getPriorityColor(workOrder.priority), 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full']">
                    {{ workOrder.priority }}
                  </span>
                </dd>
              </div>
              
              <div>
                <dt class="text-sm font-medium text-gray-500">Asset</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  {{ workOrder.asset.tag }} - {{ workOrder.asset.description }}
                </dd>
              </div>
              
              <div>
                <dt class="text-sm font-medium text-gray-500">Plant / Area</dt>
                <dd class="mt-1 text-sm text-gray-900">
                  {{ workOrder.asset.plant?.name || '-' }} / {{ workOrder.asset.area?.name || '-' }}
                </dd>
              </div>
              
              <div class="sm:col-span-2">
                <dt class="text-sm font-medium text-gray-500">Description</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ workOrder.description || '-' }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Schedule and Assignment -->
        <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg mt-6">
          <div class="p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Schedule & Assignment</h3>
            
            <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt class="text-sm font-medium text-gray-500">Requested Due Date</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ formatDate(workOrder.requested_due_date) }}</dd>
              </div>
              
              <div>
                <dt class="text-sm font-medium text-gray-500">Scheduled Start</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ formatDate(workOrder.scheduled_start_date) }}</dd>
              </div>
              
              <div>
                <dt class="text-sm font-medium text-gray-500">Scheduled End</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ formatDate(workOrder.scheduled_end_date) }}</dd>
              </div>
              
              <div>
                <dt class="text-sm font-medium text-gray-500">Assigned Technician</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ workOrder.assigned_technician?.name || '-' }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Planning Details -->
        <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg mt-6">
          <div class="p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Planning Details</h3>
            
            <dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt class="text-sm font-medium text-gray-500">Estimated Hours</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ workOrder.estimated_hours || '-' }}</dd>
              </div>
              
              <div>
                <dt class="text-sm font-medium text-gray-500">Actual Hours</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ workOrder.actual_hours || '-' }}</dd>
              </div>
              
              <div>
                <dt class="text-sm font-medium text-gray-500">Estimated Cost</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ formatCurrency(workOrder.estimated_total_cost) }}</dd>
              </div>
              
              <div>
                <dt class="text-sm font-medium text-gray-500">Actual Cost</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ formatCurrency(workOrder.actual_total_cost) }}</dd>
              </div>
              
              <div>
                <dt class="text-sm font-medium text-gray-500">Downtime Required</dt>
                <dd class="mt-1 text-sm text-gray-900">{{ workOrder.downtime_required ? 'Yes' : 'No' }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Parts -->
        <div v-if="workOrder.parts.length > 0" class="bg-white overflow-hidden shadow-sm sm:rounded-lg mt-6">
          <div class="p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Parts</h3>
            
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="part in workOrder.parts" :key="part.id">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {{ part.part_name }}
                      <span v-if="part.part_number" class="text-gray-500">({{ part.part_number }})</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ part.estimated_quantity }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ formatCurrency(part.unit_cost) }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ formatCurrency(part.total_cost) }}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {{ part.status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Status History -->
        <div v-if="workOrder.status_history.length > 0" class="bg-white overflow-hidden shadow-sm sm:rounded-lg mt-6">
          <div class="p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Status History</h3>
            
            <div class="flow-root">
              <ul role="list" class="-mb-8">
                <li v-for="(history, index) in workOrder.status_history" :key="history.id">
                  <div class="relative pb-8">
                    <span v-if="index !== workOrder.status_history.length - 1" class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                    <div class="relative flex space-x-3">
                      <div>
                        <span class="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                          <svg class="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                          </svg>
                        </span>
                      </div>
                      <div class="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p class="text-sm text-gray-500">
                            Changed from <span class="font-medium text-gray-900">{{ history.from_status || 'New' }}</span>
                            to <span class="font-medium text-gray-900">{{ history.to_status }}</span>
                            by <span class="font-medium text-gray-900">{{ history.changed_by.name }}</span>
                          </p>
                          <p v-if="history.reason" class="mt-1 text-sm text-gray-500">
                            Reason: {{ history.reason }}
                          </p>
                        </div>
                        <div class="text-right text-sm whitespace-nowrap text-gray-500">
                          {{ formatDate(history.created_at) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Status Change Modal -->
    <div v-if="showStatusModal" class="fixed z-10 inset-0 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900">
                  Change Status to {{ selectedStatus.replace(/_/g, ' ') }}
                </h3>
                <div class="mt-4">
                  <label for="reason" class="block text-sm font-medium text-gray-700">
                    Reason (optional)
                  </label>
                  <textarea
                    id="reason"
                    v-model="statusReason"
                    rows="3"
                    class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter reason for status change..."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="updateStatus"
              :disabled="statusForm.processing"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              Update Status
            </button>
            <button
              @click="showStatusModal = false"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </AuthenticatedLayout>
</template>