
export type SelectedCommand = 
  { command: 'Move' }
| { command: 'Attack' }
| { command: 'Build', building: string }
| { command: 'Harvest' };
