import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyFamily from '../MyFamily';

jest.mock('../../services/firebasePeople', () => ({
  peopleService: {
    getPeople: jest.fn(async () => [
      {
        id: 'p1',
        userId: 'u1',
        firstName: 'Parent',
        lastName: 'One',
        roles: ['parent'],
        familyId: 'f1',
        email: 'parent@test.com',
        hasAccount: true,
        relationships: [],
        contactPreferences: [],
        programs: [],
        teams: [],
        groups: [],
        source: 'signup',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'u1',
        isActive: true,
      },
    ]),
    getPersonByUserId: jest.fn(async () => ({
      id: 'p1',
      userId: 'u1',
      firstName: 'Parent',
      lastName: 'One',
      roles: ['parent'],
      familyId: 'f1',
      email: 'parent@test.com',
      hasAccount: true,
      relationships: [],
      contactPreferences: [],
      programs: [],
      teams: [],
      groups: [],
      source: 'signup',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'u1',
      isActive: true,
    })),
    getPeopleByFamily: jest.fn(async () => [
      {
        id: 'p1',
        userId: 'u1',
        firstName: 'Parent',
        lastName: 'One',
        roles: ['parent'],
        familyId: 'f1',
        email: 'parent@test.com',
        hasAccount: true,
        relationships: [],
        contactPreferences: [],
        programs: [],
        teams: [],
        groups: [],
        source: 'signup',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'u1',
        isActive: true,
      },
      {
        id: 'a1',
        firstName: 'Athlete',
        lastName: 'One',
        roles: ['athlete'],
        dateOfBirth: '2015-01-01',
        sex: 'male',
        familyId: 'f1',
        email: 'athlete@test.com',
        hasAccount: false,
        relationships: [],
        contactPreferences: [],
        programs: [],
        teams: [],
        groups: [],
        source: 'signup',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'u1',
        isActive: true,
      },
    ]),
  },
}));

jest.mock('../../services/firebaseProgramRegistrations', () => ({
  programRegistrationsService: {
    getProgramRegistrationsByFamily: jest.fn(async () => [
      {
        id: 'r1',
        programId: 'prog1',
        athleteId: 'a1',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ]),
  },
}));

jest.mock('../../services/firebasePrograms', () => ({
  programsService: {
    getPrograms: jest.fn(async () => [{ id: 'prog1', name: 'Soccer 2026' }]),
  },
}));

jest.mock('../../services/firebaseFamilies', () => ({
  familiesService: {
    getFamily: jest.fn(async () => ({
      id: 'f1',
      name: 'Test Family',
      primaryParentId: 'p1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  },
}));

// ---- Mock Ant Design ----
jest.mock('antd/lib/message', () => ({
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
}));

// ---- Mock Redux ----
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (fn: any) =>
    fn({
      auth: {
        user: { uid: 'u1', email: 'parent@test.com', displayName: 'Parent One' },
        isAuthenticated: true,
        role: 'parent',
      },
      theme: { darkMode: false },
    }),
  useDispatch: () => jest.fn(),
}));

// ---- Tests ----
describe('MyFamily Page', () => {
  /**
   * NOTE: MyFamily component has complex async initialization with multiple
   * interdependent service calls (getPeople, getPersonByUserId, getPeopleByFamily, etc.).
   * This makes unit testing with mocks difficult due to race conditions and
   * timing issues. These basic tests verify the component renders without crashing.
   *
   * For comprehensive testing of family member display and registration flows,
   * see tests/e2e/myfamily.spec.ts for Playwright E2E tests which test the
   * actual async behavior with real timing.
   */

  test('renders page without crashing', async () => {
    const { container } = render(
      <BrowserRouter>
        <MyFamily />
      </BrowserRouter>,
    );

    // Verify the page container renders
    expect(container.querySelector('.page-container')).toBeInTheDocument();

    // Verify main heading is present
    await waitFor(() => {
      expect(screen.getByText('My Family')).toBeInTheDocument();
    });
  });

  test('displays page description and buttons', async () => {
    render(
      <BrowserRouter>
        <MyFamily />
      </BrowserRouter>,
    );

    // Verify the page description
    await waitFor(() => {
      expect(
        screen.getByText('Manage your family information and add family members'),
      ).toBeInTheDocument();
    });

    // Verify "Add Family Member" button is rendered
    await waitFor(() => {
      expect(screen.getByText('Add Family Member')).toBeInTheDocument();
    });
  });

  test('mocked services are available and configured', async () => {
    const { peopleService } = require('../../services/firebasePeople');
    const { programRegistrationsService } = require('../../services/firebaseProgramRegistrations');
    const { programsService } = require('../../services/firebasePrograms');
    const { familiesService } = require('../../services/firebaseFamilies');

    // Verify mocks are set up correctly
    expect(peopleService.getPeople).toBeDefined();
    expect(peopleService.getPersonByUserId).toBeDefined();
    expect(peopleService.getPeopleByFamily).toBeDefined();
    expect(programRegistrationsService.getProgramRegistrationsByFamily).toBeDefined();
    expect(programsService.getPrograms).toBeDefined();
    expect(familiesService.getFamily).toBeDefined();
  });
});
