import apiClient from '@/client/utils/apiClient';
import {
    changePassword,
    login,
    logout,
    me,
    register,
    requestPasswordReset,
    resetPassword,
    updateProfile,
    passkeyRegisterOptions,
    passkeyRegisterVerify,
    passkeyList,
    passkeyDelete,
    passkeyLoginOptions,
    passkeyLoginVerify
} from './index';
import {
    ChangePasswordRequest,
    ChangePasswordResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    RegisterRequest,
    RegisterResponse,
    CurrentUserResponse,
    RequestPasswordResetRequest,
    RequestPasswordResetResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    UpdateProfileRequest,
    UpdateProfileResponse,
    PasskeyRegisterOptionsResponse,
    PasskeyRegisterVerifyRequest,
    PasskeyRegisterVerifyResponse,
    PasskeyListResponse,
    PasskeyDeleteRequest,
    PasskeyDeleteResponse,
    PasskeyLoginOptionsResponse,
    PasskeyLoginVerifyRequest,
    PasskeyLoginVerifyResponse
} from './types';

export const apiLogin = (params: LoginRequest) => {
    return apiClient.call<LoginResponse, LoginRequest>(login, params);
};

export const apiRegister = (params: RegisterRequest) => {
    return apiClient.call<RegisterResponse, RegisterRequest>(register, params);
};

export const apiFetchCurrentUser = () => {
    return apiClient.call<CurrentUserResponse>(me, {});
};

export const apiLogout = () => {
    return apiClient.call<LogoutResponse>(logout, {});
};

export const apiUpdateProfile = (params: UpdateProfileRequest) => {
    return apiClient.call<UpdateProfileResponse, UpdateProfileRequest>(updateProfile, params);
};

export const apiChangePassword = (params: ChangePasswordRequest) => {
    return apiClient.call<ChangePasswordResponse, ChangePasswordRequest>(changePassword, params);
};

export const apiRequestPasswordReset = (params: RequestPasswordResetRequest) => {
    return apiClient.call<RequestPasswordResetResponse, RequestPasswordResetRequest>(requestPasswordReset, params);
};

export const apiResetPassword = (params: ResetPasswordRequest) => {
    return apiClient.call<ResetPasswordResponse, ResetPasswordRequest>(resetPassword, params);
};

export const apiPasskeyRegisterOptions = () => {
    return apiClient.call<PasskeyRegisterOptionsResponse>(passkeyRegisterOptions, {});
};

export const apiPasskeyRegisterVerify = (params: PasskeyRegisterVerifyRequest) => {
    return apiClient.call<PasskeyRegisterVerifyResponse, PasskeyRegisterVerifyRequest>(passkeyRegisterVerify, params);
};

export const apiPasskeyList = () => {
    return apiClient.call<PasskeyListResponse>(passkeyList, {});
};

export const apiPasskeyDelete = (params: PasskeyDeleteRequest) => {
    return apiClient.call<PasskeyDeleteResponse, PasskeyDeleteRequest>(passkeyDelete, params);
};

export const apiPasskeyLoginOptions = () => {
    return apiClient.call<PasskeyLoginOptionsResponse>(passkeyLoginOptions, {});
};

export const apiPasskeyLoginVerify = (params: PasskeyLoginVerifyRequest) => {
    return apiClient.call<PasskeyLoginVerifyResponse, PasskeyLoginVerifyRequest>(passkeyLoginVerify, params);
};
