/**
 * Physical constants, written as a Spw sheet: the SI defining constants (exact
 * since 2019) and CODATA 2018 values for the rest with their standard
 * uncertainties in the concise form, 6.67430(15)e-11, and the Planck units
 * derived from them in the sheet itself, their uncertainties propagated. A theory reads this and extends it:
 *
 *   readQuantitySheet(myTheory, readQuantitySheet(SI_CONSTANTS))
 *
 * Kept as text, not as numbers in code, so the definitions are the same data a
 * person writes and a reader shows.
 */
export const SI_CONSTANTS = `^constants{
 %c[299792458 m/s]
 %h[6.62607015e-34 J*s]
 %hbar[@h/(2*pi)]
 %e[1.602176634e-19 C]
 %k_B[1.380649e-23 J/K]
 %N_A[6.02214076e23 mol^-1]
 %G[6.67430(15)e-11 m^3/(kg*s^2)]
 %m_e[9.1093837015(28)e-31 kg]
 %m_p[1.67262192369(51)e-27 kg]
 %epsilon_0[8.8541878128(13)e-12 F/m]
 %alpha[@e^2/(4*pi*@epsilon_0*@hbar*@c)]
 %l_P[(@hbar*@G/@c^3)^(1/2)]
 %m_P[(@hbar*@c/@G)^(1/2)]
 %t_P[@l_P/@c]
 %E_P[@m_P*@c^2]
 %T_P[@E_P/@k_B]
}`
