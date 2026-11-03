import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { FoodLog, FoodPrefs, MealPlan } from './types'

const store = vi.hoisted(() => ({
  plans: [] as MealPlan[],
  prefs: { activePlanId: null, shareWithFriends: false } as FoodPrefs,
  logs: [] as FoodLog[],
  savedLogs: [] as FoodLog[],
  savedPlans: [] as MealPlan[],
  savedPrefs: [] as FoodPrefs[],
  savedCustom: [] as unknown[],
}))

vi.mock('@/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ status: 'signed-in', user: { uid: 'user-1', displayName: 'Test', email: null, photoURL: null } }),
}))

vi.mock('@/data/repository', () => ({
  subscribeRoutines: (_uid: string, onChange: (value: unknown[]) => void) => {
    onChange([])
    return () => {}
  },
  subscribeCompletions: (_uid: string, onChange: (value: unknown[]) => void) => {
    onChange([])
    return () => {}
  },
}))

vi.mock('@/data/food', () => ({
  subscribeMealPlans: (_uid: string, onChange: (plans: MealPlan[]) => void) => {
    onChange(store.plans)
    return () => {}
  },
  subscribeFoodPrefs: (_uid: string, onChange: (prefs: FoodPrefs) => void) => {
    onChange(store.prefs)
    return () => {}
  },
  subscribeFoodLogs: (_uid: string, _from: string, onChange: (logs: FoodLog[]) => void) => {
    onChange(store.logs)
    return () => {}
  },
  fetchFoodLogs: async () => [],
  saveFoodLog: async (_uid: string, log: FoodLog) => {
    store.savedLogs.push(log)
  },
  saveMealPlan: async (plan: MealPlan) => {
    store.savedPlans.push(plan)
  },
  saveFoodPrefs: async (_uid: string, prefs: FoodPrefs) => {
    store.savedPrefs.push(prefs)
  },
  deleteMealPlan: async () => {},
  subscribeCustomFoods: (_uid: string, onChange: (foods: unknown[]) => void) => {
    onChange([])
    return () => {}
  },
  saveCustomFood: async (_uid: string, food: unknown) => {
    store.savedCustom.push(food)
  },
}))

const { AppProviders } = await import('@/app/App')
const { FoodPage } = await import('./FoodPage')
const { MealPlanEditorPage } = await import('./MealPlanEditorPage')

const plan: MealPlan = {
  id: 'plan-1',
  ownerId: 'user-1',
  name: 'Coach plan',
  meals: {
    breakfast: [
      { id: 'oats', name: 'Oats', portion: '1 cup', kcal: 300 },
      { id: 'eggs', name: 'Eggs' },
    ],
    lunch: [{ id: 'rice', name: 'Chicken and rice' }],
    dinner: [{ id: 'fish', name: 'Salmon' }],
    snacks: [],
  },
  createdAt: '',
  updatedAt: '',
}

function renderAt(path: string) {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/food" element={<FoodPage />} />
          <Route path="/app/food/plans/new" element={<MealPlanEditorPage />} />
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(() => {
  store.plans = []
  store.prefs = { activePlanId: null, shareWithFriends: false }
  store.logs = []
  store.savedLogs = []
  store.savedPlans = []
  store.savedPrefs = []
  store.savedCustom = []
})

describe('FoodPage', () => {
  it('asks for a meal plan first', async () => {
    renderAt('/app/food')
    expect(await screen.findByRole('heading', { name: 'Add your meal plan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add meal plan/ })).toHaveAttribute('href', '/app/food/plans/new')
  })

  it('logs a planned option, something else, and a skip', async () => {
    store.plans = [plan]
    store.prefs = { activePlanId: 'plan-1', shareWithFriends: false }
    renderAt('/app/food')
    const breakfast = (await screen.findByRole('heading', { name: 'Breakfast' })).closest('section') as HTMLElement
    await act(async () => {
      fireEvent.click(within(breakfast).getByRole('button', { name: /Oats/ }))
    })
    expect(within(breakfast).getByRole('button', { name: /Oats/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(breakfast).getByText('As planned')).toBeInTheDocument()
    expect(store.savedLogs.at(-1)?.entries).toMatchObject([{ meal: 'breakfast', status: 'planned', optionId: 'oats' }])

    const lunch = screen.getByRole('heading', { name: 'Lunch' }).closest('section') as HTMLElement
    fireEvent.click(within(lunch).getByRole('button', { name: 'Something else' }))
    const picker = await screen.findByRole('dialog', { name: 'What did you eat for Lunch?' })
    fireEvent.change(within(picker).getByRole('searchbox', { name: 'Search foods' }), { target: { value: 'bibim' } })
    fireEvent.click(await within(picker).findByRole('button', { name: /Bibimbap/ }))
    fireEvent.click(within(picker).getByRole('button', { name: 'More servings' }))
    expect(within(picker).getByText('900 kcal · 30 g protein')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(within(picker).getByRole('button', { name: 'Add' }))
    })
    expect(within(lunch).getByText('Bibimbap')).toBeInTheDocument()
    expect(within(lunch).getByText('Something else', { selector: '.meal-status' })).toBeInTheDocument()
    expect(store.savedLogs.at(-1)?.entries.at(-1)).toMatchObject({ status: 'swapped', name: 'Bibimbap', kcal: 900, protein: 30, servings: 1.5, foodId: 'bibimbap' })

    fireEvent.click(within(lunch).getByRole('button', { name: 'Edit Bibimbap' }))
    const editor = await screen.findByRole('dialog', { name: 'Edit Bibimbap' })
    expect(within(editor).getByText('1.5')).toBeInTheDocument()
    fireEvent.click(within(editor).getByRole('button', { name: 'Fewer servings' }))
    fireEvent.change(within(editor).getByLabelText('Note (optional)'), { target: { value: 'Half bowl rice' } })
    await act(async () => {
      fireEvent.click(within(editor).getByRole('button', { name: 'Save' }))
    })
    expect(store.savedLogs.at(-1)?.entries.at(-1)).toMatchObject({ name: 'Bibimbap', kcal: 600, servings: 1, note: 'Half bowl rice', status: 'swapped' })

    const dinner = screen.getByRole('heading', { name: 'Dinner' }).closest('section') as HTMLElement
    await act(async () => {
      fireEvent.click(within(dinner).getByRole('button', { name: 'Skipped' }))
    })
    expect(within(dinner).getByRole('button', { name: 'Skipped' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('1 of 3 meals on plan')).toBeInTheDocument()
    expect(store.savedLogs.at(-1)?.entries.map((entry) => entry.status)).toEqual(['planned', 'swapped', 'skipped'])
  })

  it('marks a cheat day and adds a custom food', async () => {
    store.plans = [plan]
    renderAt('/app/food')
    const cheatButton = await screen.findByRole('button', { name: 'Cheat day' })
    await act(async () => {
      fireEvent.click(cheatButton)
    })
    expect(screen.getByRole('button', { name: 'Cheat day' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Cheat day: not counted in your score')).toBeInTheDocument()
    expect(store.savedLogs.at(-1)).toMatchObject({ entries: [], cheat: true })

    const dinner = screen.getByRole('heading', { name: 'Dinner' }).closest('section') as HTMLElement
    fireEvent.click(within(dinner).getByRole('button', { name: 'Something else' }))
    const picker = await screen.findByRole('dialog')
    fireEvent.change(within(picker).getByRole('searchbox'), { target: { value: 'Grandma stew' } })
    fireEvent.click(await within(picker).findByRole('button', { name: 'Add “Grandma stew” as a custom food' }))
    fireEvent.change(within(picker).getByLabelText('kcal per serving'), { target: { value: '450' } })
    fireEvent.change(within(picker).getByLabelText('Protein (g) per serving'), { target: { value: '25' } })
    await act(async () => {
      fireEvent.click(within(picker).getByRole('button', { name: 'Save and add' }))
    })
    expect(store.savedCustom).toMatchObject([{ name: 'Grandma stew', kcal: 450, protein: 25 }])
    await act(async () => {
      fireEvent.click(within(picker).getByRole('button', { name: 'Add' }))
    })
    expect(store.savedLogs.at(-1)).toMatchObject({ cheat: true, entries: [{ name: 'Grandma stew', kcal: 450, protein: 25 }] })
  })

  it('shows what was eaten on a day picked from the calendar', async () => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    store.plans = [plan]
    store.logs = [
      {
        date: today,
        entries: [
          { id: 'e1', meal: 'breakfast', status: 'planned', optionId: 'oats', name: 'Oats', portion: '1 cup', kcal: 300 },
          { id: 'e2', meal: 'lunch', status: 'swapped', name: 'Bibimbap', kcal: 600, protein: 20, note: 'Half bowl rice' },
        ],
        updatedAt: '',
      },
    ]
    renderAt('/app/food')
    expect(await screen.findByText('Tap a day to see what you ate.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('gridcell', { selected: false, name: /Partly on plan/ }))
    const card = screen.getByRole('dialog', { name: /^What you ate on/ })
    expect(within(card).getByText('Oats · 1 cup')).toBeInTheDocument()
    expect(within(card).getByText('Bibimbap')).toBeInTheDocument()
    expect(within(card).getByText('600 kcal · 20 g protein')).toBeInTheDocument()
    expect(within(card).getByText('Half bowl rice')).toBeInTheDocument()
    fireEvent.click(within(card).getByRole('button', { name: 'Edit this day' }))
    expect(screen.queryByRole('dialog', { name: /^What you ate on/ })).not.toBeInTheDocument()
  })

  it('turns on sharing with friends', async () => {
    store.plans = [plan]
    renderAt('/app/food')
    const toggle = await screen.findByRole('checkbox', { name: /Share my food log with friends/ })
    await act(async () => {
      fireEvent.click(toggle)
    })
    expect(store.savedPrefs.at(-1)).toEqual({ activePlanId: 'plan-1', shareWithFriends: true })
  })
})

describe('MealPlanEditorPage', () => {
  it('validates and saves a new plan', async () => {
    renderAt('/app/food/plans/new')
    const save = await screen.findByRole('button', { name: 'Save plan' })
    fireEvent.click(save)
    expect(screen.getByRole('alert')).toHaveTextContent('Give your plan a name.')
    fireEvent.change(screen.getByLabelText('Plan name'), { target: { value: 'Cut' } })
    fireEvent.click(save)
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one food.')
    const breakfast = screen.getByRole('group', { name: 'Breakfast' })
    fireEvent.click(within(breakfast).getByRole('button', { name: 'Add food' }))
    const picker = await screen.findByRole('dialog', { name: 'Add food to Breakfast' })
    fireEvent.change(within(picker).getByRole('searchbox'), { target: { value: 'greek yogurt plain' } })
    fireEvent.click(await within(picker).findByRole('button', { name: /Greek yogurt, plain/ }))
    fireEvent.click(within(picker).getByRole('button', { name: 'Add' }))
    expect(within(breakfast).getByText('Greek yogurt, plain non-fat')).toBeInTheDocument()
    fireEvent.click(within(breakfast).getByRole('button', { name: 'Edit Greek yogurt, plain non-fat' }))
    const editor = await screen.findByRole('dialog', { name: 'Edit Greek yogurt, plain non-fat' })
    fireEvent.click(within(editor).getByRole('button', { name: 'More servings' }))
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }))
    expect(within(breakfast).getByText(/150 kcal/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Calories (kcal)'), { target: { value: '1800' } })
    await act(async () => {
      fireEvent.click(save)
    })
    expect(store.savedPlans).toHaveLength(1)
    expect(store.savedPlans[0]).toMatchObject({
      name: 'Cut',
      targets: { kcal: 1800 },
      meals: { breakfast: [{ name: 'Greek yogurt, plain non-fat', kcal: 150, protein: 26, foodId: 'greek-yogurt', servings: 1.5 }], lunch: [], dinner: [], snacks: [] },
    })
    expect(store.savedPrefs.at(-1)?.activePlanId).toBe(store.savedPlans[0].id)
  })
})
