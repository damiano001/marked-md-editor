const { ipcRenderer, shell } = require('electron');
const marked = require('marked');
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const currentFileElement = document.getElementById('current-file');
const fileList = document.getElementById('file-list');
const fileContextMenu = document.getElementById('file-context-menu');
const createFileBtn = document.getElementById('create-file-btn');
const renameFileOption = document.getElementById('rename-file');
const deleteFileOption = document.getElementById('delete-file');
const newFileBtn = document.getElementById('new-file');
const openFileBtn = document.getElementById('open-file');
const saveFileBtn = document.getElementById('save-file');
const saveAsFileBtn = document.getElementById('save-as-file');
const exitAppBtn = document.getElementById('exit-app');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const cutBtn = document.getElementById('cut');
const copyBtn = document.getElementById('copy');
const pasteBtn = document.getElementById('paste');
const selectAllBtn = document.getElementById('select-all');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const togglePreviewBtn = document.getElementById('toggle-preview');
const toggleEditorBtn = document.getElementById('toggle-editor');
const minimizeBtn = document.querySelector('.minimize');
const maximizeBtn = document.querySelector('.maximize');
const closeBtn = document.querySelector('.close');


let currentFilePath = null;
let unsavedChanges = false;
let openFiles = [];
let contextMenuTargetFile = null;


marked.setOptions({
  breaks: true,
  gfm: true
});


editor.addEventListener('input', () => {
  updatePreview();
  unsavedChanges = true;
});


function updatePreview() {
  const markdownText = editor.value;
  const html = marked.parse(markdownText);
  preview.innerHTML = html;
  

  const links = preview.querySelectorAll('a');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const url = link.getAttribute('href');
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        shell.openExternal(url);
      }
    });
  });
}


function newFile() {
  currentFilePath = null;
  editor.value = '';
  currentFileElement.textContent = 'Untitled.md';
  updatePreview();
  unsavedChanges = false;
  
 
  addToOpenFiles({
    path: null,
    name: 'Untitled.md',
    content: ''
  });
  
  updateFileList();
}


function addToOpenFiles(file) {
 
  const existingFileIndex = openFiles.findIndex(f => f.path === file.path);
  
  if (existingFileIndex !== -1) {
    
    openFiles[existingFileIndex].active = true;
   
    openFiles.forEach((f, i) => {
      if (i !== existingFileIndex) {
        f.active = false;
      }
    });
  } else {
   
    openFiles.forEach(f => f.active = false);
    
    
    openFiles.push({
      path: file.path,
      name: file.name,
      content: file.content,
      active: true
    });
  }
}


function updateFileList() {
  
  fileList.innerHTML = '';
  
  
  openFiles.forEach(file => {
    const fileItem = document.createElement('div');
    fileItem.className = `file-item${file.active ? ' active' : ''}`;
    fileItem.dataset.path = file.path || '';  
    
    const fileIcon = document.createElement('span');
    fileIcon.className = 'file-icon';
    fileIcon.innerHTML = '<i class="ph ph-file-text"></i>';
    
    const fileName = document.createElement('span');
    fileName.className = 'file-name';
    fileName.textContent = file.name;    
    
    const fileActions = document.createElement('div');
    fileActions.className = 'file-actions';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✖';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeFile(file);
    });
    
    fileActions.appendChild(closeBtn);
    
    
    fileItem.appendChild(fileIcon);
    fileItem.appendChild(fileName);
    fileItem.appendChild(fileActions);
    
 
    fileItem.addEventListener('click', () => switchToFile(file));
    
   
    fileItem.addEventListener('contextmenu', (e) => showContextMenu(e, file));
    
    fileList.appendChild(fileItem);
  });
}


function switchToFile(file) {
  
  if (currentFilePath !== null || (currentFilePath === null && editor.value !== '')) {
    const currentFileIndex = openFiles.findIndex(f => f.path === currentFilePath);
    if (currentFileIndex !== -1) {
      openFiles[currentFileIndex].content = editor.value;
    }
  }
  
  
  openFiles.forEach(f => f.active = (f.path === file.path && f.name === file.name));
  
  
  currentFilePath = file.path;
  editor.value = file.content;
  currentFileElement.textContent = file.name;
  updatePreview();
  updateFileList();
}


function renameFile(file) {
 
  const createRenameInput = (fileItem, fileName) => {
    
    const fileItems = document.querySelectorAll('.file-item');
    let targetFileItem = null;
    
    for (const item of fileItems) {
      if (item.dataset.path === (file.path || '') && 
          item.querySelector('.file-name').textContent === file.name) {
        targetFileItem = item;
        break;
      }
    }
    
    if (!targetFileItem) return false;
    
    
    const fileNameElement = targetFileItem.querySelector('.file-name');
    fileNameElement.style.display = 'none';
    
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'rename-input';
    input.value = fileName;
    input.style.width = '80%';
    input.style.margin = '0 5px';
    input.style.padding = '2px';
    input.style.border = '1px solid #4a4d54';
    input.style.borderRadius = '2px';
    input.style.backgroundColor = '#3a3d44';
    input.style.color = '#fff';
    
    
    const fileIcon = targetFileItem.querySelector('.file-icon');
    fileIcon.insertAdjacentElement('afterend', input);
    
    
    input.focus();
    input.select();
    
    
    let renameHandled = false;
    const handleRename = () => {
      if (renameHandled) return;
      renameHandled = true;
      const newName = input.value.trim();
      if (newName && newName !== file.name) {
        completeRename(newName);
      } else {
        cancelRename();
      }
    };
    
    const completeRename = (newName) => {
      
      if (!file.path) {
        file.name = newName;
        if (file.active) {
          currentFileElement.textContent = newName;
        }
        updateFileList();
      } else {
        
        ipcRenderer.send('rename-file', { oldPath: file.path, newName });
      }
      
     
      input.remove();
      fileNameElement.style.display = 'block';
    };
    
    const cancelRename = () => {
      input.remove();
      fileNameElement.style.display = 'block';
    };
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleRename();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelRename();
      }
    });
    
    input.addEventListener('blur', handleRename);
    
    
    input.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    return true;
  };
  
  createRenameInput(file, file.name);
}


function closeFile(file) {
  
  if (file.active && unsavedChanges) {
    const confirm = window.confirm('This file has unsaved changes. Do you want to save before closing?');
    if (confirm) {
      
      if (file.path) {
        saveFile(file.path);
      } else {
        ipcRenderer.send('show-save-dialog');
        return; 
      }
    }
  }
  
  
  const fileIndex = openFiles.findIndex(f => f.path === file.path && f.name === file.name);
  if (fileIndex !== -1) {
    openFiles.splice(fileIndex, 1);
  }
  
  
  if (file.active) {
    if (openFiles.length > 0) {
      
      switchToFile(openFiles[0]);
    } else {
      
      newFile();
    }
  } else {
   
    updateFileList();
  }
}


function showContextMenu(event, file) {
  event.preventDefault();
  
  
  contextMenuTargetFile = file;
  
  
  fileContextMenu.style.display = 'block';
  fileContextMenu.style.left = `${event.pageX}px`;
  fileContextMenu.style.top = `${event.pageY}px`;
  
  
  document.addEventListener('click', hideContextMenu);
}


function hideContextMenu() {
  fileContextMenu.style.display = 'none';
  document.removeEventListener('click', hideContextMenu);
}


ipcRenderer.on('file-opened', (event, { filePath, content }) => {
  currentFilePath = filePath;
  editor.value = content;
  updatePreview();
  
  
  const fileName = filePath.split('\\').pop().split('/').pop();
  currentFileElement.textContent = fileName;
  
  
  addToOpenFiles({
    path: filePath,
    name: fileName,
    content: content
  });
  
  
  updateFileList();
  
  unsavedChanges = false;
});


ipcRenderer.on('save-file', () => {
  if (currentFilePath) {
    saveFile(currentFilePath);
  } else {
    ipcRenderer.send('show-save-dialog');
  }
});


ipcRenderer.on('save-file-as', (event, filePath) => {
  if (filePath) {
    saveFile(filePath);
  }
});


function saveFile(filePath) {
  const content = editor.value;
  ipcRenderer.send('save-file-content', { filePath, content });
}


ipcRenderer.on('file-saved', (event, filePath) => {
  currentFilePath = filePath;  
 
  const fileName = filePath.split('\\').pop().split('/').pop();
  currentFileElement.textContent = fileName;
  
  
  const fileIndex = openFiles.findIndex(f => f.active);
  if (fileIndex !== -1) {
    openFiles[fileIndex].path = filePath;
    openFiles[fileIndex].name = fileName;
    updateFileList();
  } else {
    
    addToOpenFiles({
      path: filePath,
      name: fileName,
      content: editor.value
    });
    updateFileList();
  }
  
  unsavedChanges = false;
});


ipcRenderer.on('file-renamed', (event, { oldPath, newPath }) => {

  const newFileName = newPath.split('\\').pop().split('/').pop();

  const fileIndex = openFiles.findIndex(f => f.path === oldPath);
  if (fileIndex !== -1) {
    openFiles[fileIndex].path = newPath;
    openFiles[fileIndex].name = newFileName;
    
    
    if (currentFilePath === oldPath) {
      currentFilePath = newPath;
      currentFileElement.textContent = newFileName;
    }
    
    updateFileList();
  }
});


ipcRenderer.on('rename-error', (event, { message }) => {
  alert(`Failed to rename file: ${message}`);
  updateFileList(); 
});


ipcRenderer.on('new-file', () => {
  // TODO: Add check for unsaved changes
  newFile();
});


updatePreview();


document.addEventListener('keydown', (e) => {
  // Ctrl+B for bold
  if (e.ctrlKey && e.key === 'b') {
    e.preventDefault();
    insertMarkdownSyntax('**', '**');
  }
  
  // Ctrl+I for italic
  if (e.ctrlKey && e.key === 'i') {
    e.preventDefault();
    insertMarkdownSyntax('*', '*');
  }
  
  // Ctrl+K for link
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    insertMarkdownSyntax('[', '](url)');
  }
});


function insertMarkdownSyntax(before, after) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selectedText = editor.value.substring(start, end);
  const replacement = before + selectedText + after;
  
  editor.value = editor.value.substring(0, start) + replacement + editor.value.substring(end);
  editor.selectionStart = start + before.length;
  editor.selectionEnd = start + before.length + selectedText.length;
  editor.focus();
  
  updatePreview();
  unsavedChanges = true;
}


if (newFileBtn) newFileBtn.addEventListener('click', () => newFile());

if (openFileBtn) openFileBtn.addEventListener('click', () => {
  ipcRenderer.send('show-open-dialog');
});

if (saveFileBtn) saveFileBtn.addEventListener('click', () => {
  if (currentFilePath) {
    saveFile(currentFilePath);
  } else {
    ipcRenderer.send('show-save-dialog');
  }
});

if (saveAsFileBtn) saveAsFileBtn.addEventListener('click', () => {
  ipcRenderer.send('show-save-dialog');
});

if (exitAppBtn) exitAppBtn.addEventListener('click', () => {
  ipcRenderer.send('quit-app');
});


if (createFileBtn) createFileBtn.addEventListener('click', () => newFile());


if (renameFileOption) renameFileOption.addEventListener('click', () => {
  if (contextMenuTargetFile) {
    renameFile(contextMenuTargetFile);
    hideContextMenu();
  }
});

if (deleteFileOption) deleteFileOption.addEventListener('click', () => {
  if (contextMenuTargetFile) {
    closeFile(contextMenuTargetFile);
    hideContextMenu();
  }
});


if (undoBtn) undoBtn.addEventListener('click', () => document.execCommand('undo'));
if (redoBtn) redoBtn.addEventListener('click', () => document.execCommand('redo'));
if (cutBtn) cutBtn.addEventListener('click', () => document.execCommand('cut'));
if (copyBtn) copyBtn.addEventListener('click', () => document.execCommand('copy'));
if (pasteBtn) pasteBtn.addEventListener('click', () => document.execCommand('paste'));
if (selectAllBtn) selectAllBtn.addEventListener('click', () => document.execCommand('selectAll'));


if (toggleSidebarBtn) toggleSidebarBtn.addEventListener('click', () => {
  const sidebar = document.querySelector('.sidebar');
  sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
});

if (togglePreviewBtn) togglePreviewBtn.addEventListener('click', () => {
  const previewContainer = document.querySelector('.preview-container');
  previewContainer.style.display = previewContainer.style.display === 'none' ? 'flex' : 'none';
});

if (toggleEditorBtn) toggleEditorBtn.addEventListener('click', () => {
  const editorContainer = document.querySelector('.editor-container');
  editorContainer.style.display = editorContainer.style.display === 'none' ? 'flex' : 'none';
});


if (minimizeBtn) minimizeBtn.addEventListener('click', () => {
  ipcRenderer.send('minimize-window');
});

if (maximizeBtn) maximizeBtn.addEventListener('click', () => {
  ipcRenderer.send('maximize-window');
});

if (closeBtn) closeBtn.addEventListener('click', () => {
  ipcRenderer.send('close-window');
});

// ---------------- Resizable Panes ----------------
function initResizer(resizer, previous, next, isSidebar = false) {
  let startX = 0;
  let startPrevWidth = 0;

  function onMouseMove(e) {
    const dx = e.clientX - startX;
    let newPrevWidth = startPrevWidth + dx;
    const minWidth = 150;
    const maxWidth = window.innerWidth - minWidth - 20; // leave some room

    if (newPrevWidth < minWidth) newPrevWidth = minWidth;
    if (newPrevWidth > maxWidth) newPrevWidth = maxWidth;

    // Apply width via flex-basis so Flexbox respects the size without fighting width/percentages
    previous.style.flex = `0 0 ${newPrevWidth}px`;
    previous.style.width = `${newPrevWidth}px`;

    if (!isSidebar) {
      // Ensure the neighbour fills the remaining space cleanly
      next.style.flex = '1 1 auto';
      next.style.width = 'auto';
    }
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  resizer.addEventListener('mousedown', (e) => {
    startX = e.clientX;
    startPrevWidth = previous.getBoundingClientRect().width;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  const sidebarResizer = document.querySelector('.sidebar-resizer');
  const mainContent = document.querySelector('.main-content');
  if (sidebar && sidebarResizer && mainContent) {
    initResizer(sidebarResizer, sidebar, mainContent, true);
  }

  const editorContainer = document.querySelector('.editor-container');
  const previewResizer = document.querySelector('.preview-resizer');
  const previewContainer = document.querySelector('.preview-container');
  if (editorContainer && previewResizer && previewContainer) {
    initResizer(previewResizer, editorContainer, previewContainer, false);
  }

  // --- Theme Toggling ---
  const toggleThemeBtn = document.getElementById('toggle-theme');

  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }

  if (toggleThemeBtn) {
    toggleThemeBtn.addEventListener('click', () => {
      const newTheme = document.body.classList.contains('light-mode') ? 'dark' : 'light';
      applyTheme(newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }

  // Apply saved theme on startup
  const savedTheme = localStorage.getItem('theme') || 'dark'; // Default to dark
  applyTheme(savedTheme);
});
