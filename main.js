const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  


  mainWindow.on('closed', function () {
    mainWindow = null;
  });


}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click() {
            mainWindow.webContents.send('new-file');
          }
        },
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click() {
            openFile();
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click() {
            mainWindow.webContents.send('save-file');
          }
        },
        {
          label: 'Save As',
          accelerator: 'CmdOrCtrl+Shift+S',
          click() {
            saveFileAs();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click() {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function openFile() {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('An error occurred reading the file:', err);
          return;
        }
        mainWindow.webContents.send('file-opened', { filePath, content: data });
      });
    }
  }).catch(err => {
    console.error('Error opening file dialog:', err);
  });
}

function saveFileAs() {
  dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Markdown Files', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }).then(result => {
    if (!result.canceled) {
      mainWindow.webContents.send('save-file-as', result.filePath);
    }
  }).catch(err => {
    console.error('Error opening save dialog:', err);
  });
}

ipcMain.on('save-file-content', (event, { filePath, content }) => {
  fs.writeFile(filePath, content, err => {
    if (err) {
      console.error('An error occurred writing the file:', err);
      return;
    }
    mainWindow.webContents.send('file-saved', filePath);
  });
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});


ipcMain.on('show-open-dialog', () => {
  openFile();
});

ipcMain.on('show-save-dialog', () => {
  saveFileAs();
});

ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.on('rename-file', (event, { oldPath, newName }) => {
  try {
    const oldPathObj = path.parse(oldPath);
    const newPath = path.join(oldPathObj.dir, newName);
    
    
    if (fs.existsSync(newPath)) {
      mainWindow.webContents.send('rename-error', {
        message: `A file named '${newName}' already exists.`
      });
      return;
    }
    

    fs.renameSync(oldPath, newPath);
    
  
    mainWindow.webContents.send('file-renamed', { oldPath, newPath });
  } catch (err) {
    console.error('Error renaming file:', err);
    mainWindow.webContents.send('rename-error', {
      message: `Error renaming file: ${err.message}`
    });
  }
});

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});
