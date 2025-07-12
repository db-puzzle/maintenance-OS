<script setup>
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue'
import { Head, Link, router } from '@inertiajs/vue3'
import { ref, computed, watch } from 'vue'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/vue/24/outline'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const props = defineProps({
  workOrders: Object,
  filters: Object,
  statuses: Array,
  categories: Array,
  priorities: Array,
})

const search = ref(props.filters.search || '')
const selectedStatus = ref(props.filters.status || '')
const selectedCategory = ref(props.filters.category || '')
const selectedPriority = ref(props.filters.priority || '')
const showFilters = ref(false)

// Debounced search
let searchTimeout = null
watch(search, (value) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    applyFilters()
  }, 500)
})

function applyFilters() {
  router.get(route('work-orders.index'), {
    search: search.value,
    status: selectedStatus.value,
    category: selectedCategory.value,
    priority: selectedPriority.value,
  }, {
    preserveState: true,
    preserveScroll: true,
  })
}

function clearFilters() {
  search.value = ''
  selectedStatus.value = ''
  selectedCategory.value = ''
  selectedPriority.value = ''
  applyFilters()
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

function getCategoryColor(category) {
  const colors = {
    corrective: 'bg-red-100 text-red-800',
    preventive: 'bg-green-100 text-green-800',
    inspection: 'bg-yellow-100 text-yellow-800',
    project: 'bg-purple-100 text-purple-800',
  }
  return colors[category] || 'bg-gray-100 text-gray-800'
}

function formatDate(date) {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
}
</script>

<template>
  <Head title="Work Orders" />

  <AuthenticatedLayout>
    <template #header>
      <div class="flex justify-between items-center">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
          Work Orders
        </h2>
        <Link
          :href="route('work-orders.create')"
          class="inline-flex items-center px-4 py-2 bg-gray-800 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-gray-700 active:bg-gray-900 focus:outline-none focus:border-gray-900 focus:ring ring-gray-300 disabled:opacity-25 transition ease-in-out duration-150"
        >
          <PlusIcon class="-ml-1 mr-2 h-5 w-5" />
          New Work Order
        </Link>
      </div>
    </template>

    <div class="py-12">
      <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
          <!-- Search and Filters -->
          <div class="p-6 border-b border-gray-200">
            <div class="flex flex-col sm:flex-row gap-4">
              <!-- Search -->
              <div class="flex-1">
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon class="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    v-model="search"
                    type="search"
                    placeholder="Search work orders..."
                    class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <!-- Filter Toggle -->
              <button
                @click="showFilters = !showFilters"
                class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <FunnelIcon class="-ml-1 mr-2 h-5 w-5" />
                Filters
              </button>
            </div>

            <!-- Filter Options -->
            <div v-if="showFilters" class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Status</label>
                <select
                  v-model="selectedStatus"
                  @change="applyFilters"
                  class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">All Statuses</option>
                  <option v-for="status in statuses" :key="status" :value="status">
                    {{ status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.replace(/_/g, ' ').slice(1) }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Category</label>
                <select
                  v-model="selectedCategory"
                  @change="applyFilters"
                  class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">All Categories</option>
                  <option v-for="category in categories" :key="category" :value="category">
                    {{ category.charAt(0).toUpperCase() + category.slice(1) }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700">Priority</label>
                <select
                  v-model="selectedPriority"
                  @change="applyFilters"
                  class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">All Priorities</option>
                  <option v-for="priority in priorities" :key="priority" :value="priority">
                    {{ priority.charAt(0).toUpperCase() + priority.slice(1) }}
                  </option>
                </select>
              </div>

              <div class="sm:col-span-3">
                <button
                  @click="clearFilters"
                  class="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          </div>

          <!-- Work Orders Table -->
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Order
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th class="relative px-6 py-3">
                    <span class="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="workOrder in workOrders.data" :key="workOrder.id">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div class="text-sm font-medium text-gray-900">
                        {{ workOrder.work_order_number }}
                      </div>
                      <div class="text-sm text-gray-500">
                        {{ workOrder.title }}
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{ workOrder.asset.tag }}
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ workOrder.asset.description }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      :class="[getCategoryColor(workOrder.work_order_category), 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full']"
                    >
                      {{ workOrder.work_order_category }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      :class="[getPriorityColor(workOrder.priority), 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full']"
                    >
                      {{ workOrder.priority }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      :class="[getStatusColor(workOrder.status), 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full']"
                    >
                      {{ workOrder.status.replace(/_/g, ' ') }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ workOrder.requested_due_date ? formatDate(workOrder.requested_due_date) : '-' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ workOrder.assigned_technician?.name || '-' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      :href="route('work-orders.show', workOrder.id)"
                      class="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="workOrders.links.length > 3" class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div class="flex-1 flex justify-between sm:hidden">
              <Link
                v-if="workOrders.prev_page_url"
                :href="workOrders.prev_page_url"
                class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Previous
              </Link>
              <Link
                v-if="workOrders.next_page_url"
                :href="workOrders.next_page_url"
                class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Next
              </Link>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-gray-700">
                  Showing
                  <span class="font-medium">{{ workOrders.from }}</span>
                  to
                  <span class="font-medium">{{ workOrders.to }}</span>
                  of
                  <span class="font-medium">{{ workOrders.total }}</span>
                  results
                </p>
              </div>
              <div>
                <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <template v-for="link in workOrders.links" :key="link.label">
                    <Link
                      v-if="link.url"
                      :href="link.url"
                      :class="[
                        link.active ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                        'relative inline-flex items-center px-4 py-2 border text-sm font-medium'
                      ]"
                      v-html="link.label"
                    />
                    <span
                      v-else
                      :class="[
                        'relative inline-flex items-center px-4 py-2 border border-gray-300 bg-gray-100 text-sm font-medium text-gray-700 cursor-not-allowed'
                      ]"
                      v-html="link.label"
                    />
                  </template>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AuthenticatedLayout>
</template>