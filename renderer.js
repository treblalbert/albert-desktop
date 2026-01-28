const { ipcRenderer } = require('electron');
const path = require('path');

// SVG Icons
const icons = {
  folder: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>`,
  globe: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"/></svg>`,
  file: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>`,
  dropFiles: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"/></svg>`,
  expand: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/></svg>`,
  refresh: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>`
};

// State
let data = { tabs: [], activeTab: null };
let editingTabId = null;
let editingShortcutIndex = null;
let contextShortcutIndex = null;
let contextTabId = null;

// DOM
const widget = document.getElementById('widget');
const tabsBar = document.getElementById('tabsBar');
const shortcutsGrid = document.getElementById('shortcutsGrid');
const content = document.getElementById('content');
const dropZone = document.getElementById('dropZone');
const settings = document.getElementById('settings');
const opacitySlider = document.getElementById('opacitySlider');
const collapseBtn = document.getElementById('collapseBtn');

// Modals
const tabModal = document.getElementById('tabModal');
const tabModalTitle = document.getElementById('tabModalTitle');
const tabNameInput = document.getElementById('tabNameInput');
const tabModalDelete = document.getElementById('tabModalDelete');

const shortcutModal = document.getElementById('shortcutModal');
const shortcutModalTitle = document.getElementById('shortcutModalTitle');
const shortcutNameInput = document.getElementById('shortcutNameInput');
const shortcutPathInput = document.getElementById('shortcutPathInput');

// Context Menus
const shortcutContextMenu = document.getElementById('shortcutContextMenu');
const tabContextMenu = document.getElementById('tabContextMenu');

// Listen for reload-icons event from main process
ipcRenderer.on('reload-icons', () => {
  console.log('Reloading all icons...');
  reloadAllIcons();
});

// Reload all icons (clear cached paths and re-render)
async function reloadAllIcons() {
  // Clear all cached iconPath from shortcuts
  for (const tab of data.tabs) {
    for (const shortcut of tab.shortcuts) {
      delete shortcut.iconPath;
    }
  }
  await saveData();
  await renderShortcuts();
}

// Reload a single shortcut's icon
async function reloadSingleIcon(index) {
  const tab = data.tabs.find(t => t.id === data.activeTab);
  if (!tab?.shortcuts[index]) return;
  
  const shortcut = tab.shortcuts[index];
  
  // Clear the cached icon path from data
  delete shortcut.iconPath;
  
  // Clear the cached icon file
  await ipcRenderer.invoke('clear-single-icon-cache', shortcut.path);
  
  // Force re-extract
  const iconPath = await ipcRenderer.invoke('extract-icon', shortcut.path, true);
  if (iconPath) {
    shortcut.iconPath = iconPath;
  }
  
  await saveData();
  
  // Re-render
  await renderShortcuts();
}

// Initialize
async function init() {
  data = await ipcRenderer.invoke('load-data');
  const config = await ipcRenderer.invoke('get-config');
  const isExpanded = await ipcRenderer.invoke('get-expanded-state');
  
  if (!isExpanded) {
    widget.classList.add('collapsed');
    collapseBtn.innerHTML = icons.expand;
  }
  
  opacitySlider.value = (config.opacity || 0.95) * 100;
  
  renderTabs();
  renderShortcuts();
  setupEvents();
}

// Render tabs
function renderTabs() {
  tabsBar.innerHTML = '';
  
  data.tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = `tab ${tab.id === data.activeTab ? 'active' : ''}`;
    btn.textContent = tab.name;
    btn.dataset.tabId = tab.id;
    
    btn.addEventListener('click', () => switchTab(tab.id));
    btn.addEventListener('contextmenu', e => showTabContext(e, tab.id));
    btn.addEventListener('dblclick', () => openEditTab(tab.id));
    
    tabsBar.appendChild(btn);
  });
  
  const addBtn = document.createElement('button');
  addBtn.className = 'tab tab-add';
  addBtn.innerHTML = icons.plus;
  addBtn.addEventListener('click', openNewTab);
  tabsBar.appendChild(addBtn);
}

// Render shortcuts
async function renderShortcuts() {
  const tab = data.tabs.find(t => t.id === data.activeTab);
  
  if (!tab || tab.shortcuts.length === 0) {
    shortcutsGrid.innerHTML = `
      <div class="empty-state">
        ${icons.dropFiles}
        <h3>No shortcuts yet</h3>
        <p>Drag files or folders here to add them</p>
      </div>
      <div class="add-btn" id="addShortcutBtn">${icons.plus}</div>
    `;
    bindAddBtn();
    return;
  }
  
  shortcutsGrid.innerHTML = '';
  
  for (let i = 0; i < tab.shortcuts.length; i++) {
    const shortcut = tab.shortcuts[i];
    const item = document.createElement('div');
    item.className = 'shortcut';
    item.dataset.index = i;
    item.title = shortcut.path;
    
    // Get icon - pass index for caching
    const iconHtml = await getIconHtml(shortcut, i);
    
    item.innerHTML = `
      <button class="shortcut-delete" data-index="${i}">&times;</button>
      <div class="shortcut-icon ${getIconClass(shortcut.path)}">${iconHtml}</div>
      <div class="shortcut-name">${shortcut.name}</div>
    `;
    
    item.addEventListener('click', e => {
      if (!e.target.classList.contains('shortcut-delete')) openShortcut(i);
    });
    item.addEventListener('contextmenu', e => showShortcutContext(e, i));
    
    const deleteBtn = item.querySelector('.shortcut-delete');
    deleteBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteShortcut(i);
    });
    
    shortcutsGrid.appendChild(item);
  }
  
  const addBtn = document.createElement('div');
  addBtn.className = 'add-btn';
  addBtn.id = 'addShortcutBtn';
  addBtn.innerHTML = icons.plus;
  shortcutsGrid.appendChild(addBtn);
  bindAddBtn();
}

function bindAddBtn() {
  const btn = document.getElementById('addShortcutBtn');
  if (btn) btn.addEventListener('click', openNewShortcut);
}

async function getIconHtml(shortcut, index) {
  const filePath = shortcut.path;
  console.log(`Getting icon for: ${filePath}`);
  
  // URL - use globe icon
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return icons.globe;
  }
  
  // Check if it's a folder (no extension or ends with slash)
  const ext = path.extname(filePath).toLowerCase();
  const isFolder = !ext || filePath.endsWith('/') || filePath.endsWith('\\');
  
  // For folders, try to get the folder icon, otherwise use SVG
  if (isFolder) {
    try {
      const iconPath = await ipcRenderer.invoke('extract-icon', filePath, false);
      console.log(`Folder icon path: ${iconPath}`);
      if (iconPath) {
        return `<img src="file:///${iconPath.replace(/\\/g, '/')}" draggable="false" style="width:32px;height:32px;" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span style="display:none">${icons.folder}</span>`;
      }
    } catch (e) {
      console.error('Folder icon error:', e);
    }
    return icons.folder;
  }
  
  // Check if we have a cached icon path
  if (shortcut.iconPath && shortcut.iconPath.length > 0) {
    console.log(`Using cached icon: ${shortcut.iconPath}`);
    const imgSrc = shortcut.iconPath.startsWith('file://') ? shortcut.iconPath : `file:///${shortcut.iconPath.replace(/\\/g, '/')}`;
    return `<img src="${imgSrc}" draggable="false" style="width:32px;height:32px;" onerror="console.error('Image load failed:', this.src);this.style.display='none';this.nextElementSibling.style.display='block'"><span style="display:none">${icons.file}</span>`;
  }
  
  // Try to extract icon
  try {
    console.log(`Extracting icon for: ${filePath}`);
    const iconPath = await ipcRenderer.invoke('extract-icon', filePath, false);
    console.log(`Extracted icon path: ${iconPath}`);
    if (iconPath) {
      // Cache the icon path in the shortcut data
      const tab = data.tabs.find(t => t.id === data.activeTab);
      if (tab && tab.shortcuts[index]) {
        tab.shortcuts[index].iconPath = iconPath;
        saveData();
      }
      const imgSrc = `file:///${iconPath.replace(/\\/g, '/')}`;
      console.log(`Image src: ${imgSrc}`);
      return `<img src="${imgSrc}" draggable="false" style="width:32px;height:32px;" onerror="console.error('Image load failed:', this.src);this.style.display='none';this.nextElementSibling.style.display='block'"><span style="display:none">${icons.file}</span>`;
    }
  } catch (e) {
    console.error('Error getting icon:', e);
  }
  
  // Default file icon
  return icons.file;
}

function getIconClass(filePath) {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return 'web';
  }
  const ext = path.extname(filePath).toLowerCase();
  if (!ext || filePath.endsWith('/') || filePath.endsWith('\\')) {
    return 'folder';
  }
  return '';
}

// Tab functions
function switchTab(tabId) {
  data.activeTab = tabId;
  saveData();
  renderTabs();
  renderShortcuts();
}

function openNewTab() {
  editingTabId = null;
  tabModalTitle.textContent = 'New Tab';
  tabNameInput.value = '';
  tabModalDelete.style.display = 'none';
  tabModal.classList.add('active');
  tabNameInput.focus();
}

function openEditTab(tabId) {
  const tab = data.tabs.find(t => t.id === tabId);
  if (!tab) return;
  
  editingTabId = tabId;
  tabModalTitle.textContent = 'Rename Tab';
  tabNameInput.value = tab.name;
  tabModalDelete.style.display = data.tabs.length > 1 ? 'block' : 'none';
  tabModal.classList.add('active');
  tabNameInput.focus();
}

function saveTab() {
  const name = tabNameInput.value.trim();
  if (!name) return;
  
  if (editingTabId) {
    const tab = data.tabs.find(t => t.id === editingTabId);
    if (tab) tab.name = name;
  } else {
    const id = 'tab_' + Date.now();
    data.tabs.push({ id, name, shortcuts: [] });
    data.activeTab = id;
  }
  
  saveData();
  renderTabs();
  closeTabModal();
}

function deleteTab() {
  if (!editingTabId || data.tabs.length <= 1) return;
  
  data.tabs = data.tabs.filter(t => t.id !== editingTabId);
  if (data.activeTab === editingTabId) {
    data.activeTab = data.tabs[0]?.id;
  }
  
  saveData();
  renderTabs();
  renderShortcuts();
  closeTabModal();
}

function closeTabModal() {
  tabModal.classList.remove('active');
  editingTabId = null;
}

// Shortcut functions
function openShortcut(index) {
  const tab = data.tabs.find(t => t.id === data.activeTab);
  if (!tab?.shortcuts[index]) return;
  
  const shortcut = tab.shortcuts[index];
  if (shortcut.path.startsWith('http://') || shortcut.path.startsWith('https://')) {
    ipcRenderer.invoke('open-external', shortcut.path);
  } else {
    ipcRenderer.invoke('open-path', shortcut.path);
  }
}

function openNewShortcut() {
  editingShortcutIndex = null;
  shortcutModalTitle.textContent = 'Add Shortcut';
  shortcutNameInput.value = '';
  shortcutPathInput.value = '';
  shortcutModal.classList.add('active');
  shortcutNameInput.focus();
}

function openEditShortcut(index) {
  const tab = data.tabs.find(t => t.id === data.activeTab);
  if (!tab?.shortcuts[index]) return;
  
  const shortcut = tab.shortcuts[index];
  editingShortcutIndex = index;
  shortcutModalTitle.textContent = 'Edit Shortcut';
  shortcutNameInput.value = shortcut.name;
  shortcutPathInput.value = shortcut.path;
  shortcutModal.classList.add('active');
  shortcutNameInput.focus();
}

function saveShortcut() {
  const name = shortcutNameInput.value.trim();
  const filePath = shortcutPathInput.value.trim();
  if (!name || !filePath) return;
  
  const tab = data.tabs.find(t => t.id === data.activeTab);
  if (!tab) return;
  
  if (editingShortcutIndex !== null) {
    tab.shortcuts[editingShortcutIndex] = { name, path: filePath };
  } else {
    tab.shortcuts.push({ name, path: filePath });
  }
  
  saveData();
  renderShortcuts();
  closeShortcutModal();
}

function deleteShortcut(index) {
  const tab = data.tabs.find(t => t.id === data.activeTab);
  if (!tab) return;
  
  tab.shortcuts.splice(index, 1);
  saveData();
  renderShortcuts();
}

function closeShortcutModal() {
  shortcutModal.classList.remove('active');
  editingShortcutIndex = null;
}

// Context menus
function showShortcutContext(e, index) {
  e.preventDefault();
  contextShortcutIndex = index;
  hideContextMenus();
  shortcutContextMenu.style.left = e.clientX + 'px';
  shortcutContextMenu.style.top = e.clientY + 'px';
  shortcutContextMenu.classList.add('active');
}

function showTabContext(e, tabId) {
  e.preventDefault();
  contextTabId = tabId;
  hideContextMenus();
  tabContextMenu.style.left = e.clientX + 'px';
  tabContextMenu.style.top = e.clientY + 'px';
  tabContextMenu.classList.add('active');
}

function hideContextMenus() {
  shortcutContextMenu.classList.remove('active');
  tabContextMenu.classList.remove('active');
}

// Drag and drop
function setupDragDrop() {
  content.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('active');
  });
  
  content.addEventListener('dragleave', e => {
    if (!content.contains(e.relatedTarget)) {
      dropZone.classList.remove('active');
    }
  });
  
  content.addEventListener('drop', async e => {
    e.preventDefault();
    dropZone.classList.remove('active');
    
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    
    const tab = data.tabs.find(t => t.id === data.activeTab);
    if (!tab) return;
    
    for (const file of files) {
      const name = path.basename(file.path, path.extname(file.path));
      tab.shortcuts.push({ name, path: file.path });
    }
    
    saveData();
    renderShortcuts();
  });
}

// Events
function setupEvents() {
  // Reload all icons button
  document.getElementById('reloadBtn').addEventListener('click', async () => {
    console.log('Reload button clicked');
    await ipcRenderer.invoke('clear-all-icon-cache');
    await reloadAllIcons();
  });
  
  // Collapse
  collapseBtn.addEventListener('click', async () => {
    const isExpanded = await ipcRenderer.invoke('toggle-expand');
    widget.classList.toggle('collapsed', !isExpanded);
    collapseBtn.innerHTML = isExpanded ? 
      `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15"/></svg>` : 
      icons.expand;
  });
  
  // Settings
  document.getElementById('settingsBtn').addEventListener('click', () => {
    settings.classList.toggle('active');
  });
  
  // Opacity
  opacitySlider.addEventListener('input', e => {
    ipcRenderer.invoke('set-opacity', e.target.value / 100);
  });
  
  // Tab modal
  document.getElementById('tabModalCancel').addEventListener('click', closeTabModal);
  document.getElementById('tabModalSave').addEventListener('click', saveTab);
  document.getElementById('tabModalDelete').addEventListener('click', deleteTab);
  tabNameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveTab();
    if (e.key === 'Escape') closeTabModal();
  });
  
  // Shortcut modal
  document.getElementById('shortcutModalCancel').addEventListener('click', closeShortcutModal);
  document.getElementById('shortcutModalSave').addEventListener('click', saveShortcut);
  shortcutNameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') shortcutPathInput.focus();
    if (e.key === 'Escape') closeShortcutModal();
  });
  shortcutPathInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveShortcut();
    if (e.key === 'Escape') closeShortcutModal();
  });
  
  // Context menu actions
  shortcutContextMenu.addEventListener('click', async e => {
    const action = e.target.closest('.context-item')?.dataset.action;
    if (!action) return;
    
    const tab = data.tabs.find(t => t.id === data.activeTab);
    if (!tab) return;
    
    switch (action) {
      case 'open':
        openShortcut(contextShortcutIndex);
        break;
      case 'show-in-folder':
        const shortcut = tab.shortcuts[contextShortcutIndex];
        if (shortcut) ipcRenderer.invoke('show-in-folder', shortcut.path);
        break;
      case 'reload-icon':
        await reloadSingleIcon(contextShortcutIndex);
        break;
      case 'edit':
        openEditShortcut(contextShortcutIndex);
        break;
      case 'delete':
        deleteShortcut(contextShortcutIndex);
        break;
    }
    hideContextMenus();
  });
  
  tabContextMenu.addEventListener('click', e => {
    const action = e.target.closest('.context-item')?.dataset.action;
    if (!action) return;
    
    switch (action) {
      case 'rename':
        openEditTab(contextTabId);
        break;
      case 'delete':
        editingTabId = contextTabId;
        deleteTab();
        break;
    }
    hideContextMenus();
  });
  
  // Click outside to close
  document.addEventListener('click', e => {
    if (!shortcutContextMenu.contains(e.target) && !tabContextMenu.contains(e.target)) {
      hideContextMenus();
    }
  });
  
  // Modal backdrop
  tabModal.addEventListener('click', e => {
    if (e.target === tabModal) closeTabModal();
  });
  shortcutModal.addEventListener('click', e => {
    if (e.target === shortcutModal) closeShortcutModal();
  });
  
  // Drag and drop
  setupDragDrop();
}

// Save
async function saveData() {
  await ipcRenderer.invoke('save-data', data);
}

// Start
init();
