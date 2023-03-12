
export type SelectedAction = 
  { action: 'Move' }
| { action: 'Attack' }
| { action: 'Build', building: string }
| { action: 'Harvest' };
