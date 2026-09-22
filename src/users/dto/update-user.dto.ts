import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  firebaseUid?: string;

  @IsString()
  @IsOptional()
  dni?: string;

  @IsEmail({}, { message: 'El correo electrónico debe ser una dirección válida' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  photoURL?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(
    ['administrador', 'postulante', 'alumno', 'docente', 'mpa', 'mge', 'maf', 'superadmin'],
    { message: 'El rol asignado no es válido' }
  )
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  assignedModule?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  lastLogin?: string;
}
