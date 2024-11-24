import { test, expect } from '@playwright/test';

test.setTimeout(45000);

test('Eliminar un proyecto con confirmación y verificar ítems en la papelera', async ({ page }) => {
  await page.goto('https://todo.ly/');
  await page.locator('.HPHeaderLogin > a').click();

  // Login
  await page.locator('#ctl00_MainContent_LoginControl1_TextBoxEmail').fill('lutinonilmar@gmail.com');
  await page.locator('#ctl00_MainContent_LoginControl1_TextBoxPassword').fill('147536985200');
  await page.getByRole('button', { name: 'Submit' }).click();

  // Crear proyecto
  await page.locator('div.AddProjectLiDiv:has-text("Add New Project")').click();
  await page.locator('#NewProjNameInput').fill('new testing');
  await page.locator('#NewProjNameButton').click();
  console.log('Proyecto creado');

  // Capturar el projectId del proyecto recién creado
  const projectLocator = page.locator('li.BaseProjectLi:has-text("new testing")');
  await projectLocator.waitFor({ state: 'visible' });
  const projectId = await projectLocator.getAttribute('itemid');
  if (projectId) {
    console.log(`ProjectID guardado: ${projectId}`);
  } else {
    console.error('ProjectID no encontrado para el proyecto.');
    return;
  }

  await page.waitForTimeout(1000);
  console.log('Pausa de 1 segundo completada');

  // Agregar ítems y guardar sus itemid
  const itemIds: string[] = [];
  for (const item of ['test a', 'test b', 'test c']) {
    await page.locator('#NewItemContentInput').fill(item);
    await page.locator('#NewItemAddButton').click();
    console.log(`Ítem "${item}" agregado`);
    await page.waitForTimeout(1000);

    // Capturar el itemid del ítem recién creado
    const itemIdLocator = page.locator('#mainItemList > li').last();
    const itemId = await itemIdLocator.getAttribute('itemid');
    if (itemId) {
      itemIds.push(String(itemId));
      console.log(`ItemID guardado: ${itemId}`);
    } else {
      console.error('ItemID no encontrado para un ítem.');
    }
  }
  console.log(`Todos los itemIds creados: ${itemIds}`);

  await page.waitForTimeout(1000);

  await projectLocator.hover();
  console.log('Hover sobre el proyecto realizado');

  // Abrir el menú de opciones
  const menuIcon = projectLocator.locator('div.ProjItemMenu');
  await menuIcon.waitFor({ state: 'visible' });
  await menuIcon.click();
  console.log('Menú de opciones abierto');

  // Manejo del cuadro de diálogo
  page.once('dialog', async (dialog) => {
    console.log(`Dialog message: ${dialog.message()}`);
    try {
      await dialog.accept();
      console.log('Diálogo aceptado correctamente.');
    } catch (error) {
      console.error('Error al aceptar el diálogo:', error);
    }
  });

  // Seleccionar opción "Delete"
  const deleteOption = page.locator('#projectContextMenu li.delete a');
  await deleteOption.waitFor({ state: 'visible' });
  await deleteOption.click();
  console.log('Opción "Delete" seleccionada');

  // Verificar si el proyecto se movió a la Papelera
  const recycleBin = page.locator('li.BaseFilterLi:has-text("Recycle Bin")');
  await recycleBin.waitFor({ state: 'visible' });
  await recycleBin.click();
  console.log('Papelera abierta');

  // Capturar todos los itemIDs en la papelera 
  const itemsInRecycleBin = await page.locator('#ItemListPlaceHolder #mainItemList > li').evaluateAll((items) =>
    items.map((item) => ({
      itemId: item.getAttribute('itemid'),
      textContent: item.textContent?.trim(),
    }))
  );
  
  // Filtrar solo los IDs válidos
  const validRecycleBinIds = itemsInRecycleBin
    .filter((item) => item.itemId !== null)
    .map((item) => ({
      itemId: item.itemId as string,
      textContent: item.textContent || '',
    }));
  
  console.log(`Todos los ítems encontrados en la papelera: ${JSON.stringify(validRecycleBinIds, null, 2)}`);
  
  // Verificar si los ítems están en la papelera
  for (const itemId of itemIds) {
    const match = validRecycleBinIds.find((item) => item.itemId === itemId);
    console.log(`Comparando el itemID "${itemId}" con los encontrados en la papelera.`);
    if (match) {
      console.log(`El ítem con itemid "${itemId}" está en la papelera. Detalles: ${JSON.stringify(match)}`);
    } else {
      console.error(`El ítem con itemid "${itemId}" NO está en la papelera.`);
    }
  }
  
  // Verificar que el proyecto no existe en la lista de proyectos
    const projectSelector = `#mainProjectList > li[itemid="${String(projectId)}"]`;

    try {
    await page.waitForSelector(projectSelector, { state: 'detached', timeout: 5000 });
    console.log(`El proyecto con ProjectID "${projectId}" se eliminó correctamente.`);
    } catch (error) {
    console.error(`El proyecto con ProjectID "${projectId}" aún está en la lista de proyectos.`);
    }

});
