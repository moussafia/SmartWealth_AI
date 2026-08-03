package ma.enset.userservice.mapper;

import org.mapstruct.Mapper;
import ma.enset.userservice.dto.UserDto;
import ma.enset.userservice.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {
    UserDto toDto(User user);
}
